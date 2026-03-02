import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import CarbonTree from '../../components/CarbonTree';
import api from '../../api';

export default function UserDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/user/dashboard').then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex"><Sidebar role="USER" /><div className="ml-[260px] p-8 flex-1">Loading...</div></div>;

    const carbonPoints = data?.wallet?.carbon_points || 0;

    return (
        <div className="flex">
            <Sidebar role="USER" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8 gradient-text">User Dashboard</h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Total Credits</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">{data?.total_credits || 0}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Wallet Balance</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">₹{data?.wallet?.balance || 0}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Carbon Points</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">{carbonPoints}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Credit Score</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">{(data?.credit_score || 0).toFixed(1)}/10</p>
                        </div>
                    </div>

                    {/* 3D Tree Visualization */}
                    <div className="card mb-8 relative" style={{ height: '420px', padding: 0, overflow: 'hidden', background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}>
                        <CarbonTree carbonPoints={carbonPoints} />
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-semibold text-emerald-400 mb-4">Recent Credits</h2>
                        <p className="text-xs text-slate-500 mb-3">⏰ Credits expire 24 hours after creation. Update your plant data daily!</p>
                        {data?.recent_credits?.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Plant</th>
                                        <th>Health</th>
                                        <th>CO₂/Day</th>
                                        <th>Points</th>
                                        <th>Status</th>
                                        <th>Expires</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recent_credits.map((c: any) => (
                                        <tr key={c.id}>
                                            <td>{c.plant_name || c.plant_species}</td>
                                            <td>{c.plant_health || '—'}%</td>
                                            <td>{c.carbon_per_day_kg || '—'} kg</td>
                                            <td>{c.carbon_points}</td>
                                            <td><span className={`status-badge status-${c.status?.toLowerCase()}`}>{c.status}</span></td>
                                            <td className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm">No credits yet. Create your first carbon credit!</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
