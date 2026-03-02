import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { setCredentials } from '../store';
import api from '../api';

const EXAMPLE_CSV = `Year,Pollutant_Gas_Name,Pollutant_Total_tons,Manufactured_Product
2021,CO2,4551.5,Copper Sheets & Wires
2022,CO2,4257.0,Copper Sheets & Wires
2023,CO2,4161.0,Copper Sheets & Wires
2024,CO2,4015.0,Copper Sheets & Wires
2025,CO2,3871.0,Copper Sheets & Wires`;

function parseCsvToJson(content: string): any[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        if (vals.length >= 4) {
            rows.push({
                Year: parseInt(vals[headers.indexOf('Year')] || vals[0]),
                Pollutant_Gas_Name: vals[headers.indexOf('Pollutant_Gas_Name')] || vals[1],
                Pollutant_Total_tons: parseFloat(vals[headers.indexOf('Pollutant_Total_tons')] || vals[2]),
                Manufactured_Product: vals[headers.indexOf('Manufactured_Product')] || vals[3],
            });
        }
    }
    return rows;
}

const ABSORBABLE_MAP: Record<string, string> = {
    'CO2': 'Yes', 'SO2': 'Partial', 'NOx': 'Partial', 'CO': 'No',
    'VOCs': 'Yes', 'NH3': 'Partial', 'N2O': 'No', 'O3': 'Partial',
};

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER', company_name: '', sector: '' });
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvError, setCsvError] = useState('');
    const [csvPreview, setCsvPreview] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const fileRef = useRef<HTMLInputElement>(null);

    const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

    const handleCsvUpload = (file: File) => {
        setCsvError('');
        setCsvFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const rows = parseCsvToJson(content);
            if (rows.length === 0) {
                setCsvError('Invalid CSV format. Required columns: Year, Pollutant_Gas_Name, Pollutant_Total_tons, Manufactured_Product');
                setCsvData([]);
                return;
            }
            // Client-side absorbability check
            const allNonAbsorbable = rows.every(r => {
                const gas = r.Pollutant_Gas_Name.trim().toUpperCase();
                const key = Object.keys(ABSORBABLE_MAP).find(k => k.toUpperCase() === gas);
                return key ? ABSORBABLE_MAP[key] === 'No' : false;
            });
            if (allNonAbsorbable) {
                setCsvError('Registration denied — all your pollutants (CO, N2O) cannot be absorbed by plants. At least one absorbable pollutant is required.');
                setCsvData([]);
                return;
            }
            setCsvData(rows);
            setCsvPreview(true);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload: any = { ...form };
            if (form.role === 'INDUSTRY') {
                if (csvData.length === 0) {
                    setError('Please upload a valid pollution data CSV file');
                    setLoading(false);
                    return;
                }
                payload.pollution_data_json = JSON.stringify(csvData);
            }
            const res = await api.post('/auth/register', payload);
            dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
            navigate(form.role === 'USER' ? '/user/dashboard' : '/industry/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f17 50%, #0a0f1a 100%)' }}>
            <motion.div className="card w-full max-w-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Link to="/" className="text-2xl font-bold gradient-text no-underline block text-center mb-2">🌿 GREEN COINS</Link>
                <p className="text-center text-slate-500 mb-8">Create your account</p>

                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Full Name</label>
                        <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Doe" required />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Email</label>
                        <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Password</label>
                        <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" required />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Role</label>
                        <select value={form.role} onChange={e => update('role', e.target.value)}>
                            <option value="USER">User — Create & sell carbon credits</option>
                            <option value="INDUSTRY">Industry — Purchase carbon credits</option>
                        </select>
                    </div>

                    {form.role === 'INDUSTRY' && (
                        <>
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Company Name</label>
                                <input value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder="Acme Corp" required />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Sector</label>
                                <input value={form.sector} onChange={e => update('sector', e.target.value)} placeholder="Manufacturing" />
                            </div>

                            {/* CSV Upload Section */}
                            <div className="border border-emerald-500/20 rounded-xl p-4 bg-emerald-500/5">
                                <label className="text-sm font-semibold text-emerald-400 mb-2 block">📊 Pollution Data (CSV) — Required</label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Upload a CSV file with your company's pollution report. Required columns:
                                    <code className="text-emerald-400 ml-1">Year, Pollutant_Gas_Name, Pollutant_Total_tons, Manufactured_Product</code>
                                </p>

                                <div className="bg-slate-900/50 rounded-lg p-3 mb-3 overflow-x-auto">
                                    <p className="text-xs text-slate-500 mb-1 font-semibold">Example CSV:</p>
                                    <pre className="text-xs text-emerald-300/80 whitespace-pre">{EXAMPLE_CSV}</pre>
                                </div>

                                <div className="bg-slate-900/30 rounded-lg p-3 mb-3">
                                    <p className="text-xs text-slate-500 mb-1 font-semibold">Supported Pollutants (Plants Absorption):</p>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        {Object.entries(ABSORBABLE_MAP).map(([gas, absorb]) => (
                                            <div key={gas} className="flex justify-between">
                                                <span className="text-slate-400">{gas}</span>
                                                <span className={
                                                    absorb === 'Yes' ? 'text-emerald-400' : absorb === 'Partial' ? 'text-yellow-400' : 'text-red-400'
                                                }>{absorb}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-red-400/80 mt-2">⚠️ If ALL pollutants are non-absorbable (CO, N2O), registration will be denied.</p>
                                </div>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".csv"
                                    className="text-sm"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) handleCsvUpload(f);
                                    }}
                                />

                                {csvError && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mt-2 text-red-400 text-xs">{csvError}</div>
                                )}

                                {csvPreview && csvData.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs text-emerald-400 font-semibold mb-1">✅ {csvData.length} rows parsed successfully</p>
                                        <div className="overflow-x-auto">
                                            <table className="text-xs">
                                                <thead>
                                                    <tr>
                                                        <th className="px-2 py-1">Year</th>
                                                        <th className="px-2 py-1">Pollutant</th>
                                                        <th className="px-2 py-1">Tons</th>
                                                        <th className="px-2 py-1">Product</th>
                                                        <th className="px-2 py-1">Absorbable</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvData.slice(0, 5).map((r, i) => {
                                                        const key = Object.keys(ABSORBABLE_MAP).find(k => k.toUpperCase() === r.Pollutant_Gas_Name.trim().toUpperCase());
                                                        const absorb = key ? ABSORBABLE_MAP[key] : 'Unknown';
                                                        return (
                                                            <tr key={i}>
                                                                <td className="px-2 py-1">{r.Year}</td>
                                                                <td className="px-2 py-1">{r.Pollutant_Gas_Name}</td>
                                                                <td className="px-2 py-1">{r.Pollutant_Total_tons}</td>
                                                                <td className="px-2 py-1">{r.Manufactured_Product}</td>
                                                                <td className={`px-2 py-1 ${absorb === 'Yes' ? 'text-emerald-400' : absorb === 'Partial' ? 'text-yellow-400' : 'text-red-400'
                                                                    }`}>{absorb}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {csvData.length > 5 && <p className="text-xs text-slate-500 mt-1">... and {csvData.length - 5} more rows</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-slate-500 text-sm mt-6">
                    Already have an account? <Link to="/login" className="text-emerald-400 no-underline hover:underline">Sign In</Link>
                </p>

                <p className="text-center text-slate-600 text-xs mt-3">
                    💰 Carbon Pricing: 1 kg CO₂ = 1 unit = ₹100
                </p>
            </motion.div>
        </div>
    );
}
