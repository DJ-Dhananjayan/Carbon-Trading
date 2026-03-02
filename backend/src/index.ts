import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { Client as MinioClient } from 'minio';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import industryRoutes from './routes/industry';
import governmentRoutes from './routes/government';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// PostgreSQL
export const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'greencoins',
    user: process.env.POSTGRES_USER || 'greencoins',
    password: process.env.POSTGRES_PASSWORD || 'greencoins_secret',
});

// Redis
export const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

// MinIO
export const minioClient = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

// MongoDB connection (for logs)
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/greencoins_logs';
mongoose.connect(mongoUri).then(() => console.log('MongoDB connected'))
    .catch((err: Error) => console.log('MongoDB connection error (non-critical):', err.message));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/industry', industryRoutes);
app.use('/api/government', governmentRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'greencoins-backend', pricing: '1 kg CO2 = 1 unit = ₹100' });
});

// MinIO bucket init
async function initMinio() {
    const bucket = process.env.MINIO_BUCKET || 'greencoins';
    try {
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
            await minioClient.makeBucket(bucket);
            console.log(`MinIO bucket '${bucket}' created`);

            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucket}/*`],
                    },
                ],
            };
            await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
            console.log('MinIO bucket policy set to public read');
        }
    } catch (err: any) {
        console.log('MinIO init warning (non-critical):', err.message);
    }
}

// ──────────────────────────────────────────────
// 24-hour auto-expiry: delete expired credits & deduct points
// Runs every 30 minutes
// ──────────────────────────────────────────────
async function cleanupExpiredCredits() {
    try {
        // Find expired credits
        const expired = await pool.query(
            `SELECT id, creator_id, carbon_points, plant_image_url FROM carbon_credits 
             WHERE expires_at < NOW() AND status NOT IN ('EXPIRED', 'SOLD')`
        );

        if (expired.rows.length === 0) return;

        console.log(`[Cleanup] Found ${expired.rows.length} expired credits`);

        for (const credit of expired.rows) {
            // Deduct carbon points from wallet
            await pool.query(
                'UPDATE wallets SET carbon_points = GREATEST(0, carbon_points - $1), updated_at = NOW() WHERE user_id = $2',
                [credit.carbon_points, credit.creator_id]
            );

            // Try to delete image from MinIO
            if (credit.plant_image_url) {
                try {
                    const bucket = process.env.MINIO_BUCKET || 'greencoins';
                    const objectName = credit.plant_image_url.replace(`/${bucket}/`, '');
                    await minioClient.removeObject(bucket, objectName);
                    console.log(`[Cleanup] Deleted image: ${objectName}`);
                } catch (err: any) {
                    console.log(`[Cleanup] Image delete warning: ${err.message}`);
                }
            }

            // Mark as expired
            await pool.query(
                "UPDATE carbon_credits SET status = 'EXPIRED', plant_image_url = NULL, updated_at = NOW() WHERE id = $1",
                [credit.id]
            );
        }

        console.log(`[Cleanup] Processed ${expired.rows.length} expired credits`);
    } catch (err: any) {
        console.log('[Cleanup] Error:', err.message);
    }
}

// ──────────────────────────────────────────────
// Database auto-migration: ensure all columns exist
// This fixes the issue where Docker volumes retain old schemas
// ──────────────────────────────────────────────
async function runMigrations() {
    const migrations = [
        // carbon_credits columns
        `ALTER TYPE credit_status ADD VALUE IF NOT EXISTS 'EXPIRED'`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS plant_name VARCHAR(255)`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS plant_age_years DECIMAL(5,1) DEFAULT 0`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS plant_health INTEGER DEFAULT 0`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS carbon_per_day_kg DECIMAL(10,4) DEFAULT 0`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS carbon_points INTEGER DEFAULT 0`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS ml_prediction JSONB`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')`,
        `ALTER TABLE carbon_credits ADD COLUMN IF NOT EXISTS blockchain_asset_id VARCHAR(255)`,
        // industry_pollution_data table (may not exist in old schemas)
        `CREATE TABLE IF NOT EXISTS industry_pollution_data (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            pollutant_gas VARCHAR(50) NOT NULL,
            pollutant_tons DECIMAL(12,2) NOT NULL,
            manufactured_product VARCHAR(255),
            absorbable VARCHAR(10) DEFAULT 'No',
            created_at TIMESTAMP DEFAULT NOW()
        )`,
        // Industries table columns
        `ALTER TABLE industries ADD COLUMN IF NOT EXISTS total_pollution_tons DECIMAL(12,2) DEFAULT 0.00`,
        `ALTER TABLE industries ADD COLUMN IF NOT EXISTS pollution_csv_uploaded BOOLEAN DEFAULT FALSE`,
        // Indexes (IF NOT EXISTS supported in PG 9.5+)
        `CREATE INDEX IF NOT EXISTS idx_credits_expires ON carbon_credits(expires_at)`,
        `CREATE INDEX IF NOT EXISTS idx_pollution_user ON industry_pollution_data(user_id)`,
    ];

    console.log('[Migration] Running database migrations...');
    let success = 0;
    for (const sql of migrations) {
        try {
            await pool.query(sql);
            success++;
        } catch (err: any) {
            // Ignore "already exists" or similar benign errors
            if (!err.message.includes('already exists')) {
                console.log(`[Migration] Warning: ${err.message}`);
            }
        }
    }
    console.log(`[Migration] Completed ${success}/${migrations.length} migrations successfully`);
}

// Start server
app.listen(PORT, async () => {
    console.log(`Backend running on port ${PORT}`);
    try {
        const pgResult = await pool.query('SELECT NOW()');
        console.log('PostgreSQL connected:', pgResult.rows[0].now);
    } catch (err: any) {
        console.log('PostgreSQL connection pending:', err.message);
    }

    // Run migrations BEFORE anything else
    await runMigrations();
    await initMinio();

    // Start cleanup interval (every 30 minutes)
    setInterval(cleanupExpiredCredits, 30 * 60 * 1000);
    // Run once on startup after a delay
    setTimeout(cleanupExpiredCredits, 10000);
    console.log('[Cleanup] 24-hour credit expiry scheduler started (runs every 30 min)');
});

export default app;
