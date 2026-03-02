import { Router, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { pool } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/industry/dashboard
router.get('/dashboard', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const purchased = await pool.query(
            'SELECT COUNT(*) as total FROM carbon_credits WHERE owner_id = $1 AND creator_id != $1',
            [userId]
        );
        const industry = await pool.query('SELECT * FROM industries WHERE user_id = $1', [userId]);
        const wallet = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        const recentPurchases = await pool.query(
            `SELECT cc.*, u.name as creator_name FROM carbon_credits cc 
       JOIN users u ON cc.creator_id = u.id
       WHERE cc.owner_id = $1 AND cc.creator_id != $1 
       ORDER BY cc.updated_at DESC LIMIT 5`,
            [userId]
        );

        // Pollution summary
        const pollutionSummary = await pool.query(
            `SELECT pollutant_gas, SUM(pollutant_tons) as total_tons, absorbable
             FROM industry_pollution_data WHERE user_id = $1
             GROUP BY pollutant_gas, absorbable`,
            [userId]
        );

        const carbonPoints = parseInt(wallet.rows[0]?.carbon_points) || 0;

        res.json({
            purchased_credits: parseInt(purchased.rows[0].total),
            industry: industry.rows[0] || {},
            wallet: wallet.rows[0] || { balance: 0, carbon_points: 0 },
            recent_purchases: recentPurchases.rows,
            carbon_offset: industry.rows[0]?.carbon_offset_total || 0,
            total_pollution_tons: industry.rows[0]?.total_pollution_tons || 0,
            pollution_summary: pollutionSummary.rows,
            carbon_points: carbonPoints,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/industry/pollution-report
router.get('/pollution-report', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const data = await pool.query(
            'SELECT * FROM industry_pollution_data WHERE user_id = $1 ORDER BY year ASC',
            [userId]
        );

        // Year-over-year summary
        const yearSummary = await pool.query(
            `SELECT year, SUM(pollutant_tons) as total_tons, COUNT(*) as pollutant_count
             FROM industry_pollution_data WHERE user_id = $1
             GROUP BY year ORDER BY year ASC`,
            [userId]
        );

        // By pollutant
        const pollutantSummary = await pool.query(
            `SELECT pollutant_gas, SUM(pollutant_tons) as total_tons, absorbable
             FROM industry_pollution_data WHERE user_id = $1
             GROUP BY pollutant_gas, absorbable`,
            [userId]
        );

        const industry = await pool.query('SELECT * FROM industries WHERE user_id = $1', [userId]);

        res.json({
            pollution_data: data.rows,
            year_summary: yearSummary.rows,
            pollutant_summary: pollutantSummary.rows,
            total_pollution_tons: industry.rows[0]?.total_pollution_tons || 0,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/industry/carbon-data (for 3D factory scene)
router.get('/carbon-data', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const wallet = await pool.query('SELECT carbon_points FROM wallets WHERE user_id = $1', [userId]);
        const points = parseInt(wallet.rows[0]?.carbon_points) || 0;
        res.json({ carbon_points: points });
    } catch (err: any) {
        res.json({ carbon_points: -50 });
    }
});

// GET /api/industry/credits/available
router.get('/credits/available', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT cc.*, u.name as creator_name FROM carbon_credits cc
       JOIN users u ON cc.creator_id = u.id
       WHERE cc.status = 'LISTED' AND cc.owner_id = cc.creator_id AND cc.expires_at > NOW()
       ORDER BY cc.created_at DESC`
        );
        res.json({ credits: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/industry/purchase/:creditId — Create Razorpay order
router.post('/purchase/:creditId', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const creditId = parseInt(req.params.creditId);
        const credit = await pool.query('SELECT * FROM carbon_credits WHERE id = $1 AND status = $2', [creditId, 'LISTED']);
        if (credit.rows.length === 0) {
            return res.status(404).json({ error: 'Credit not available' });
        }

        const amount = Math.round(credit.rows[0].price * 100); // paise
        let orderId = `order_sim_${Date.now()}`;

        // Try Razorpay
        try {
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            const order = await razorpay.orders.create({
                amount,
                currency: 'INR',
                receipt: `credit_${creditId}_${Date.now()}`,
            });
            orderId = order.id;
        } catch {
            console.log('Razorpay unavailable, using simulated order');
        }

        // Create payment record
        await pool.query(
            'INSERT INTO payments (user_id, razorpay_order_id, amount, status) VALUES ($1, $2, $3, $4)',
            [req.user!.id, orderId, credit.rows[0].price, 'PENDING']
        );

        res.json({
            order_id: orderId,
            amount,
            currency: 'INR',
            credit: credit.rows[0],
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/industry/verify-payment — Verify and transfer ownership
router.post('/verify-payment', authenticate, authorize('INDUSTRY'), async (req: AuthRequest, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credit_id } = req.body;
        const buyerId = req.user!.id;

        // Verify signature (or simulate)
        let verified = false;
        if (razorpay_signature && process.env.RAZORPAY_KEY_SECRET !== 'placeholder_secret') {
            const generated = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');
            verified = generated === razorpay_signature;
        } else {
            verified = true; // simulated mode
        }

        if (!verified) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        const credit = await pool.query('SELECT * FROM carbon_credits WHERE id = $1', [credit_id]);
        if (credit.rows.length === 0) {
            return res.status(404).json({ error: 'Credit not found' });
        }

        const sellerId = credit.rows[0].creator_id;

        // Blockchain transfer
        let blockchainTxId = `tx-${Date.now()}`;
        try {
            const bcUrl = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:4000';
            const bcResponse = await axios.post(`${bcUrl}/api/transfer`, {
                asset_id: credit.rows[0].blockchain_asset_id,
                from_owner: sellerId,
                to_owner: buyerId,
            }, { timeout: 10000 });
            blockchainTxId = bcResponse.data.transaction_id;
        } catch (err: any) {
            console.log('Blockchain transfer warning:', err.message);
        }

        // Update credit ownership
        await pool.query(
            "UPDATE carbon_credits SET owner_id = $1, status = 'SOLD', blockchain_tx_id = $2, updated_at = NOW() WHERE id = $3",
            [buyerId, blockchainTxId, credit_id]
        );

        // Update payment
        await pool.query(
            "UPDATE payments SET status = 'COMPLETED', razorpay_payment_id = $1, razorpay_signature = $2, updated_at = NOW() WHERE razorpay_order_id = $3",
            [razorpay_payment_id || 'simulated', razorpay_signature || 'simulated', razorpay_order_id]
        );

        // Record transaction
        await pool.query(
            'INSERT INTO transactions (credit_id, from_user_id, to_user_id, tx_type, amount, blockchain_tx_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [credit_id, sellerId, buyerId, 'TRANSFER', credit.rows[0].price, blockchainTxId]
        );

        // Update seller wallet
        await pool.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [credit.rows[0].price, sellerId]
        );

        // Update buyer wallet — add carbon points (offsets pollution debt)
        await pool.query(
            'UPDATE wallets SET carbon_points = carbon_points + $1, updated_at = NOW() WHERE user_id = $2',
            [credit.rows[0].carbon_points, buyerId]
        );

        // Update industry carbon offset
        await pool.query(
            'UPDATE industries SET carbon_offset_total = carbon_offset_total + $1 WHERE user_id = $2',
            [credit.rows[0].carbon_value, buyerId]
        );

        res.json({ success: true, transaction_id: blockchainTxId });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
