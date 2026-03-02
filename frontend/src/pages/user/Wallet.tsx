import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function Wallet() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/user/wallet').then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex">
            <Sidebar role="USER" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8 gradient-text">Wallet</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Balance</p>
                            <p className="text-4xl font-bold text-emerald-400 mt-1">₹{data?.wallet?.balance || 0}</p>
                        </div>
                        <div className="stat-card">
                            <p className="text-slate-400 text-sm">Carbon Points</p>
                            <p className="text-4xl font-bold text-emerald-400 mt-1">{data?.wallet?.carbon_points || 0}</p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-emerald-400">Earnings History</h2>
                            <button className="btn-secondary text-sm" onClick={() => alert('Payout functionality requires Razorpay API keys. Configure in .env')}>
                                💸 Withdraw
                            </button>
                        </div>
                        {data?.earnings?.length > 0 ? (
                            <table>
                                <thead><tr><th>Species</th><th>Amount</th><th>Blockchain TX</th><th>Date</th></tr></thead>
                                <tbody>
                                    {data.earnings.map((e: any) => (
                                        <tr key={e.id}>
                                            <td>{e.plant_species}</td>
                                            <td className="text-emerald-400 font-medium">₹{e.amount}</td>
                                            <td className="text-xs text-slate-500 max-w-[200px] truncate">{e.blockchain_tx_id}</td>
                                            <td>{new Date(e.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-sm">No earnings yet. Your credits will generate income when purchased by industries.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
