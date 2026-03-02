import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import axios from 'axios';
import { pool } from '../index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/auth/register
router.post('/register', upload.single('pollution_csv'), async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, company_name, company_registration, sector, pollution_data_json } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'email, password, name, and role are required' });
        }

        if (!['USER', 'INDUSTRY'].includes(role)) {
            return res.status(400).json({ error: 'Role must be USER or INDUSTRY' });
        }

        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // ── Industry: validate pollution CSV data ──
        let pollutionData: any[] = [];
        let pollutionAnalysis: any = null;

        if (role === 'INDUSTRY') {
            // Parse CSV from file or JSON body
            if (req.file) {
                const csvContent = req.file.buffer.toString('utf-8');
                pollutionData = parseCsv(csvContent);
            } else if (pollution_data_json) {
                try {
                    pollutionData = JSON.parse(pollution_data_json);
                } catch {
                    return res.status(400).json({ error: 'Invalid pollution data format' });
                }
            }

            if (!pollutionData || pollutionData.length === 0) {
                return res.status(400).json({
                    error: 'Industry registration requires pollution data CSV. Please upload a CSV file with columns: Year, Pollutant_Gas_Name, Pollutant_Total_tons, Manufactured_Product'
                });
            }

            // Validate with ML service
            try {
                const mlUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';
                const mlResponse = await axios.post(`${mlUrl}/analyze-pollution`, {
                    data: pollutionData,
                }, { timeout: 15000 });
                pollutionAnalysis = mlResponse.data;

                if (!pollutionAnalysis.can_register) {
                    return res.status(400).json({
                        error: pollutionAnalysis.message,
                        details: pollutionAnalysis,
                    });
                }
            } catch (err: any) {
                console.log('ML pollution analysis error:', err.message);
                // If ML service is down, do local validation
                pollutionAnalysis = localPollutionCheck(pollutionData);
                if (!pollutionAnalysis.can_register) {
                    return res.status(400).json({
                        error: pollutionAnalysis.message,
                        details: pollutionAnalysis,
                    });
                }
            }
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, role, company_name, company_registration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role',
            [email, password_hash, name, role, company_name || null, company_registration || null]
        );

        const user = result.rows[0];

        // Create wallet
        await pool.query('INSERT INTO wallets (user_id, balance, carbon_points) VALUES ($1, 0, 0)', [user.id]);

        // If industry, create industry record and store pollution data
        if (role === 'INDUSTRY') {
            const totalTons = pollutionAnalysis?.total_pollution_tons || 0;
            await pool.query(
                'INSERT INTO industries (user_id, company_name, registration_number, sector, total_pollution_tons, pollution_csv_uploaded) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.id, company_name || name, company_registration || null, sector || null, totalTons, true]
            );

            // Store individual pollution rows
            for (const row of pollutionData) {
                const gasName = row.Pollutant_Gas_Name || row.pollutant_gas || '';
                const absorbability = getAbsorbability(gasName);
                await pool.query(
                    'INSERT INTO industry_pollution_data (user_id, year, pollutant_gas, pollutant_tons, manufactured_product, absorbable) VALUES ($1, $2, $3, $4, $5, $6)',
                    [user.id, row.Year || row.year, gasName, row.Pollutant_Total_tons || row.pollutant_tons || 0, row.Manufactured_Product || row.manufactured_product || '', absorbability]
                );
            }

            // Set wallet carbon_points to negative (pollution debt)
            const debtPoints = Math.round(totalTons * 1000); // 1 ton = 1000 kg = 1000 units
            await pool.query(
                'UPDATE wallets SET carbon_points = $1, updated_at = NOW() WHERE user_id = $2',
                [-debtPoints, user.id]
            );
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'greencoins_dev_jwt_secret_2024',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            user,
            token,
            pollution_analysis: pollutionAnalysis,
        });
    } catch (err: any) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'greencoins_dev_jwt_secret_2024',
            { expiresIn: '24h' }
        );

        res.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            token,
        });
    } catch (err: any) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ── Helper: Parse CSV string ──
function parseCsv(content: string): any[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Year', 'Pollutant_Gas_Name', 'Pollutant_Total_tons', 'Manufactured_Product'];
    const hasHeaders = requiredHeaders.every(rh =>
        headers.some(h => h.toLowerCase() === rh.toLowerCase())
    );

    if (!hasHeaders) return [];

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 4) {
            rows.push({
                Year: parseInt(values[headers.indexOf('Year')] || values[0]),
                Pollutant_Gas_Name: values[headers.indexOf('Pollutant_Gas_Name')] || values[1],
                Pollutant_Total_tons: parseFloat(values[headers.indexOf('Pollutant_Total_tons')] || values[2]),
                Manufactured_Product: values[headers.indexOf('Manufactured_Product')] || values[3],
            });
        }
    }
    return rows;
}

// ── Pollutant absorbability lookup ──
const POLLUTANT_ABSORBABILITY: Record<string, string> = {
    'CO2': 'Yes',
    'SO2': 'Partial',
    'NOx': 'Partial',
    'CO': 'No',
    'VOCs': 'Yes',
    'NH3': 'Partial',
    'N2O': 'No',
    'O3': 'Partial',
};

function getAbsorbability(gas: string): string {
    const normalized = gas.trim().toUpperCase();
    for (const [key, val] of Object.entries(POLLUTANT_ABSORBABILITY)) {
        if (key.toUpperCase() === normalized) return val;
    }
    return 'Unknown';
}

function localPollutionCheck(data: any[]): any {
    let totalTons = 0;
    let hasAbsorbable = false;
    let allNonAbsorbable = true;

    for (const row of data) {
        const gas = row.Pollutant_Gas_Name || '';
        const absorbability = getAbsorbability(gas);
        totalTons += parseFloat(row.Pollutant_Total_tons) || 0;

        if (absorbability === 'Yes' || absorbability === 'Partial') {
            hasAbsorbable = true;
            allNonAbsorbable = false;
        } else if (absorbability === 'Unknown') {
            allNonAbsorbable = false;
        }
    }

    const canRegister = hasAbsorbable || !allNonAbsorbable;
    return {
        can_register: canRegister,
        total_pollution_tons: Math.round(totalTons * 100) / 100,
        message: canRegister
            ? 'Registration approved — your pollutants can be offset by plants.'
            : 'Registration denied — your pollutants (CO, N2O) cannot be absorbed by plants.',
    };
}

export default router;
