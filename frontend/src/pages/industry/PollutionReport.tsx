import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function PollutionReport() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/industry/pollution-report').then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex"><Sidebar role="INDUSTRY" /><div className="ml-[260px] p-8 flex-1">Loading...</div></div>;

    return (
        <div className="flex">
            <Sidebar role="INDUSTRY" />
            <div className="ml-[260px] p-8 flex-1 max-w-6xl">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#60a5fa' }}>Pollution Report</h1>

                    <div className="stat-card mb-8">
                        <p className="text-slate-400 text-sm">Total Recorded Pollution</p>
                        <p className="text-4xl font-bold text-amber-400 mt-1">{data?.total_pollution_tons || 0} tons</p>
                        <p className="text-xs text-slate-500 mt-1">= {((data?.total_pollution_tons || 0) * 1000).toLocaleString()} kg = ₹{((data?.total_pollution_tons || 0) * 1000 * 100).toLocaleString()} to offset</p>
                    </div>

                    {/* Year-over-Year Summary */}
                    {data?.year_summary?.length > 0 && (
                        <div className="card mb-8">
                            <h2 className="text-lg font-semibold text-blue-400 mb-4">Year-over-Year Trend</h2>
                            <div className="flex items-end gap-3" style={{ height: '180px' }}>
                                {data.year_summary.map((y: any, i: number) => {
                                    const maxTons = Math.max(...data.year_summary.map((s: any) => parseFloat(s.total_tons)));
                                    const height = maxTons > 0 ? (parseFloat(y.total_tons) / maxTons) * 150 : 10;
                                    const prevTons = i > 0 ? parseFloat(data.year_summary[i - 1].total_tons) : null;
                                    const trend = prevTons ? (parseFloat(y.total_tons) < prevTons ? '📉' : '📈') : '';
                                    return (
                                        <div key={y.year} className="flex flex-col items-center flex-1">
                                            <span className="text-xs text-slate-400 mb-1">{parseFloat(y.total_tons).toFixed(0)}t</span>
                                            <div
                                                style={{ height: `${height}px`, width: '100%', maxWidth: '60px' }}
                                                className="bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg"
                                            />
                                            <span className="text-xs text-slate-500 mt-2">{y.year}</span>
                                            {trend && <span className="text-xs">{trend}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pollutant Breakdown */}
                    {data?.pollutant_summary?.length > 0 && (
                        <div className="card mb-8">
                            <h2 className="text-lg font-semibold text-blue-400 mb-4">Pollutant Breakdown</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {data.pollutant_summary.map((p: any, i: number) => (
                                    <div key={i} className="bg-slate-900/30 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-slate-300">{p.pollutant_gas}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${p.absorbable === 'Yes' ? 'bg-emerald-500/15 text-emerald-400' :
                                                    p.absorbable === 'Partial' ? 'bg-yellow-500/15 text-yellow-400' :
                                                        'bg-red-500/15 text-red-400'
                                                }`}>
                                                {p.absorbable}
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-slate-200">{parseFloat(p.total_tons).toFixed(1)} tons</p>
                                        <p className="text-xs text-slate-500 mt-1">= ₹{(parseFloat(p.total_tons) * 1000 * 100).toLocaleString()} offset cost</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detailed Data */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-blue-400 mb-4">Detailed Records</h2>
                        {data?.pollution_data?.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Year</th>
                                        <th>Pollutant</th>
                                        <th>Tons</th>
                                        <th>Product</th>
                                        <th>Absorbable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.pollution_data.map((r: any) => (
                                        <tr key={r.id}>
                                            <td>{r.year}</td>
                                            <td>{r.pollutant_gas}</td>
                                            <td>{r.pollutant_tons} tons</td>
                                            <td>{r.manufactured_product}</td>
                                            <td>
                                                <span className={`status-badge ${r.absorbable === 'Yes' ? 'status-listed' :
                                                        r.absorbable === 'Partial' ? 'status-pending' :
                                                            'bg-red-500/15 text-red-400'
                                                    }`}>
                                                    {r.absorbable}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm">No pollution data recorded.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
