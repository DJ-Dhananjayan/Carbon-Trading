import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function GovDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/government/dashboard').then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex"><Sidebar role="GOVERNMENT" /><div className="ml-[260px] p-8 flex-1">Loading...</div></div>;

    return (
        <div className="flex">
            <Sidebar role="GOVERNMENT" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#a78bfa' }}>Government Dashboard</h1>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                        {[
                            { label: 'Total Users', value: data?.total_users, color: '#a78bfa' },
                            { label: 'Total Credits', value: data?.total_credits, color: '#10b981' },
                            { label: 'Transactions', value: data?.total_transactions, color: '#60a5fa' },
                            { label: 'Carbon (kg)', value: data?.total_carbon_value?.toFixed(1), color: '#f59e0b' },
                            { label: 'Revenue (₹)', value: data?.total_revenue?.toFixed(0), color: '#ef4444' },
                        ].map((s, i) => (
                            <div key={i} className="stat-card">
                                <p className="text-slate-400 text-xs">{s.label}</p>
                                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value || 0}</p>
                            </div>
                        ))}
                    </div>

                    <div className="card">
                        <h2 className="text-lg font-semibold text-purple-400 mb-4">Recent Activity</h2>
                        {data?.recent_activity?.length > 0 ? (
                            <table>
                                <thead><tr><th>Type</th><th>Species</th><th>From</th><th>To</th><th>Amount</th><th>Date</th></tr></thead>
                                <tbody>
                                    {data.recent_activity.map((a: any) => (
                                        <tr key={a.id}>
                                            <td><span className={`status-badge ${a.tx_type === 'CREATION' ? 'status-listed' : 'status-sold'}`}>{a.tx_type}</span></td>
                                            <td>{a.plant_species}</td>
                                            <td>{a.from_name}</td>
                                            <td>{a.to_name}</td>
                                            <td>₹{a.amount || 0}</td>
                                            <td>{new Date(a.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm">No activity yet.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
