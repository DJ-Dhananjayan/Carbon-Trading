import { Router, Response } from 'express';
import { pool } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/government/dashboard
router.get('/dashboard', authenticate, authorize('GOVERNMENT'), async (_req: AuthRequest, res: Response) => {
    try {
        const users = await pool.query('SELECT COUNT(*) as total FROM users');
        const credits = await pool.query('SELECT COUNT(*) as total FROM carbon_credits');
        const transactions = await pool.query('SELECT COUNT(*) as total FROM transactions');
        const totalCarbon = await pool.query('SELECT COALESCE(SUM(carbon_value), 0) as total FROM carbon_credits');
        const totalRevenue = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED'");

        const recentActivity = await pool.query(
            `SELECT t.*, cc.plant_species, u1.name as from_name, u2.name as to_name
       FROM transactions t
       JOIN carbon_credits cc ON t.credit_id = cc.id
       JOIN users u1 ON t.from_user_id = u1.id
       JOIN users u2 ON t.to_user_id = u2.id
       ORDER BY t.created_at DESC LIMIT 10`
        );

        res.json({
            total_users: parseInt(users.rows[0].total),
            total_credits: parseInt(credits.rows[0].total),
            total_transactions: parseInt(transactions.rows[0].total),
            total_carbon_value: parseFloat(totalCarbon.rows[0].total),
            total_revenue: parseFloat(totalRevenue.rows[0].total),
            recent_activity: recentActivity.rows,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/government/users
router.get('/users', authenticate, authorize('GOVERNMENT'), async (_req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.name, u.role, u.company_name, u.created_at, 
              w.balance, w.carbon_points
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       ORDER BY u.created_at DESC`
        );
        res.json({ users: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/government/credits
router.get('/credits', authenticate, authorize('GOVERNMENT'), async (_req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT cc.*, creator.name as creator_name, owner.name as owner_name
       FROM carbon_credits cc
       JOIN users creator ON cc.creator_id = creator.id
       JOIN users owner ON cc.owner_id = owner.id
       ORDER BY cc.created_at DESC`
        );
        res.json({ credits: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/government/transactions
router.get('/transactions', authenticate, authorize('GOVERNMENT'), async (_req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT t.*, cc.plant_species, cc.carbon_value,
              u1.name as from_name, u2.name as to_name
       FROM transactions t
       JOIN carbon_credits cc ON t.credit_id = cc.id
       JOIN users u1 ON t.from_user_id = u1.id
       JOIN users u2 ON t.to_user_id = u2.id
       ORDER BY t.created_at DESC`
        );
        res.json({ transactions: result.rows });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
