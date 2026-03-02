import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import IndustryScene from '../../components/IndustryScene';
import api from '../../api';

export default function IndustryDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/industry/dashboard').then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex"><Sidebar role="INDUSTRY" /><div className="ml-[260px] p-8 flex-1">Loading...</div></div>;

    const carbonPoints = data?.carbon_points || -50;
    const totalPollution = data?.total_pollution_tons || 0;

    return (
        <div className="flex">
            <Sidebar role="INDUSTRY" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#60a5fa' }}>Industry Dashboard</h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Credits Purchased</p>
                            <p className="text-3xl font-bold text-blue-400 mt-1">{data?.purchased_credits || 0}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Carbon Offset</p>
                            <p className="text-3xl font-bold text-blue-400 mt-1">{data?.carbon_offset || 0} kg</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Carbon Points</p>
                            <p className={`text-3xl font-bold mt-1 ${carbonPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {carbonPoints}
                            </p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Total Pollution</p>
                            <p className="text-3xl font-bold text-amber-400 mt-1">{totalPollution} tons</p>
                        </div>
                    </div>

                    {/* 3D Factory Visualization */}
                    <div className="card mb-8 relative" style={{ height: '420px', padding: 0, overflow: 'hidden', background: 'linear-gradient(to bottom, #334155, #0f172a)' }}>
                        <IndustryScene carbonPoints={carbonPoints} />
                    </div>

                    {/* Pollution Summary */}
                    {data?.pollution_summary?.length > 0 && (
                        <div className="card mb-8">
                            <h2 className="text-lg font-semibold text-blue-400 mb-4">Pollution Breakdown</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {data.pollution_summary.map((p: any, i: number) => (
                                    <div key={i} className="bg-slate-900/30 rounded-xl p-3">
                                        <p className="text-xs text-slate-500">{p.pollutant_gas}</p>
                                        <p className="text-lg font-bold text-slate-300">{p.total_tons} tons</p>
                                        <span className={`text-xs ${p.absorbable === 'Yes' ? 'text-emerald-400' : p.absorbable === 'Partial' ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {p.absorbable === 'Yes' ? '🌿 Absorbable' : p.absorbable === 'Partial' ? '⚠️ Partial' : '❌ Non-absorbable'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h2 className="text-lg font-semibold text-blue-400 mb-4">Recent Purchases</h2>
                        <p className="text-xs text-slate-500 mb-3">💰 1 kg CO₂ = 1 unit = ₹100 • Buy credits to offset your pollution debt</p>
                        {data?.recent_purchases?.length > 0 ? (
                            <table>
                                <thead><tr><th>Species</th><th>Carbon Value</th><th>Price</th><th>From</th><th>Date</th></tr></thead>
                                <tbody>
                                    {data.recent_purchases.map((c: any) => (
                                        <tr key={c.id}>
                                            <td>{c.plant_species}</td>
                                            <td>{c.carbon_value} kg</td>
                                            <td>₹{c.price}</td>
                                            <td>{c.creator_name}</td>
                                            <td>{new Date(c.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm">No purchases yet. Browse available credits to offset your carbon footprint.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
