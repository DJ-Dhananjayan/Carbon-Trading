import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { pool, minioClient } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
    { name: 'leaf_image', maxCount: 1 },
    { name: 'plant_image', maxCount: 1 },
]);
const FormData = require('form-data');

// GET /api/user/dashboard
router.get('/dashboard', authenticate, authorize('USER'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const credits = await pool.query(
            "SELECT COUNT(*) as total FROM carbon_credits WHERE creator_id = $1 AND status != 'EXPIRED'",
            [userId]
        );
        const wallet = await pool.query('SELECT balance, carbon_points FROM wallets WHERE user_id = $1', [userId]);
        const recentCredits = await pool.query(
            `SELECT id, plant_species, plant_name, plant_health, carbon_per_day_kg, carbon_value, carbon_points, status, 
             expires_at, created_at, ml_prediction
             FROM carbon_credits WHERE creator_id = $1 AND status != 'EXPIRED'
             ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );

        // Credit score: average of all active credits' credit_scores
        const creditScoreResult = await pool.query(
            `SELECT AVG((ml_prediction->>'credit_score')::numeric) as avg_score 
             FROM carbon_credits WHERE creator_id = $1 AND status != 'EXPIRED' AND ml_prediction IS NOT NULL`,
            [userId]
        );

        res.json({
            total_credits: parseInt(credits.rows[0].total),
            wallet: wallet.rows[0] || { balance: 0, carbon_points: 0 },
            recent_credits: recentCredits.rows,
            credit_score: parseFloat(creditScoreResult.rows[0]?.avg_score) || 0,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/user/credits — Create carbon credit (expires in 24 hours)
// Accepts two images: leaf_image (for species detection) and plant_image (for height/health analysis)
router.post('/credits', authenticate, authorize('USER'), uploadFields, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { plant_name, plant_details } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const leafFile = files?.leaf_image?.[0];
        const plantFile = files?.plant_image?.[0];
        let leafImageUrl = '';
        let plantImageUrl = '';

        // Upload images to MinIO
        const bucket = process.env.MINIO_BUCKET || 'greencoins';

        if (leafFile) {
            const fileName = `plants/leaf-${uuidv4()}-${leafFile.originalname}`;
            try {
                await minioClient.putObject(bucket, fileName, leafFile.buffer, leafFile.size, {
                    'Content-Type': leafFile.mimetype,
                });
                leafImageUrl = `/${bucket}/${fileName}`;
            } catch {
                leafImageUrl = `/uploads/${fileName}`;
            }
        }

        if (plantFile) {
            const fileName = `plants/full-${uuidv4()}-${plantFile.originalname}`;
            try {
                await minioClient.putObject(bucket, fileName, plantFile.buffer, plantFile.size, {
                    'Content-Type': plantFile.mimetype,
                });
                plantImageUrl = `/${bucket}/${fileName}`;
            } catch {
                plantImageUrl = `/uploads/${fileName}`;
            }
        }

        // Call ML service — new /analyze-plant endpoint with image analysis
        let mlResult: any = {
            species: 'Unknown', plant_name: 'Unknown Plant', plant_age_years: 3,
            plant_health: 70, carbon_per_day_kg: 0.05, carbon_value: 18.0,
            carbon_points: 5, credit_score: 3.0, price_inr: 5.0
        };
        try {
            const mlUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

            // If images are available, use the new /analyze-plant endpoint
            if (leafFile || plantFile) {
                const formData = new FormData();
                formData.append('plant_name', plant_name || plant_details || '');
                formData.append('quantity', '1');

                if (leafFile) {
                    formData.append('leaf_image', leafFile.buffer, {
                        filename: leafFile.originalname,
                        contentType: leafFile.mimetype,
                    });
                }
                if (plantFile) {
                    formData.append('plant_image', plantFile.buffer, {
                        filename: plantFile.originalname,
                        contentType: plantFile.mimetype,
                    });
                }

                const mlResponse = await axios.post(`${mlUrl}/analyze-plant`, formData, {
                    timeout: 30000,
                    headers: formData.getHeaders(),
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });
                mlResult = mlResponse.data;
            } else {
                // Fallback: text-only analysis via legacy endpoint
                const mlResponse = await axios.post(`${mlUrl}/predict-plant`, {
                    plant_details: plant_name || plant_details || 'general plant',
                    image_url: '',
                }, { timeout: 10000 });
                mlResult = mlResponse.data;
            }
        } catch (err: any) {
            console.log('ML service unavailable, using defaults:', err.message);
        }

        // Store credit in blockchain
        let blockchainTxId = '';
        let blockchainAssetId = '';
        try {
            const bcUrl = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:4000';
            const bcResponse = await axios.post(`${bcUrl}/api/credits`, {
                creator_id: userId,
                species: mlResult.species,
                carbon_value: mlResult.carbon_value,
                carbon_points: mlResult.carbon_points,
            }, { timeout: 10000 });
            blockchainTxId = bcResponse.data.transaction_id;
            blockchainAssetId = bcResponse.data.asset_id;
        } catch (err: any) {
            console.log('Blockchain service unavailable:', err.message);
            blockchainTxId = `local-${uuidv4()}`;
            blockchainAssetId = `asset-${uuidv4()}`;
        }

        // Price: STRICTLY use ML calculated price (1 kg = ₹100). No user override allowed.
        const creditPrice = mlResult.price_inr || (mlResult.carbon_per_day_kg * 100);

        // Use leaf image URL as primary display image, fall back to plant image
        const imageUrl = leafImageUrl || plantImageUrl;

        // Store in PostgreSQL with 24-hour expiry
        const result = await pool.query(
            `INSERT INTO carbon_credits 
       (creator_id, owner_id, plant_species, plant_image_url, plant_name, plant_age_years, plant_health, 
        carbon_per_day_kg, carbon_value, carbon_points, price, status, blockchain_tx_id, blockchain_asset_id, 
        ml_prediction, expires_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'LISTED', $11, $12, $13, NOW() + INTERVAL '24 hours')
       RETURNING *`,
            [userId, mlResult.species, imageUrl, mlResult.plant_name, mlResult.plant_age_years,
                mlResult.plant_health, mlResult.carbon_per_day_kg, mlResult.carbon_value,
                mlResult.carbon_points, creditPrice, blockchainTxId, blockchainAssetId,
                JSON.stringify(mlResult)]
        );

        // Update wallet points
        await pool.query(
            'UPDATE wallets SET carbon_points = carbon_points + $1, updated_at = NOW() WHERE user_id = $2',
            [mlResult.carbon_points, userId]
        );

        // Record transaction
        await pool.query(
            'INSERT INTO transactions (credit_id, from_user_id, to_user_id, tx_type, amount, blockchain_tx_id) VALUES ($1, $2, $2, $3, $4, $5)',
            [result.rows[0].id, userId, 'CREATION', 0, blockchainTxId]
        );

        res.status(201).json({ credit: result.rows[0], ml_prediction: mlResult });
    } catch (err: any) {
        console.error('Create credit error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/user/credits
router.get('/credits', authenticate, authorize('USER'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            "SELECT * FROM carbon_credits WHERE creator_id = $1 AND status != 'EXPIRED' ORDER BY created_at DESC",
            [req.user!.id]
        );
        res.json({ credits: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/user/wallet
router.get('/wallet', authenticate, authorize('USER'), async (req: AuthRequest, res: Response) => {
    try {
        const wallet = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user!.id]);
        const earnings = await pool.query(
            `SELECT t.*, cc.plant_species FROM transactions t 
       JOIN carbon_credits cc ON t.credit_id = cc.id 
       WHERE t.from_user_id = $1 AND t.tx_type = 'TRANSFER' 
       ORDER BY t.created_at DESC`,
            [req.user!.id]
        );
        res.json({
            wallet: wallet.rows[0] || { balance: 0, carbon_points: 0 },
            earnings: earnings.rows,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/user/carbon-data (for 3D tree — user-specific)
router.get('/carbon-data', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const result = await pool.query(
            'SELECT COALESCE(carbon_points, 0) as total_points FROM wallets WHERE user_id = $1',
            [userId]
        );
        const points = parseInt(result.rows[0]?.total_points) || 0;
        // Clamp to 0-10 for UI (credit_score scale)
        const uiScore = Math.min(10, Math.max(0, Math.round(points / 10)));
        res.json({ total_points: points, ui_score: uiScore });
    } catch (err: any) {
        res.json({ total_points: 0, ui_score: 0 });
    }
});

export default router;
