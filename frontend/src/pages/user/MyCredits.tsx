import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function MyCredits() {
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/user/credits').then(r => setCredits(r.data.credits || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex">
            <Sidebar role="USER" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8 gradient-text">My Credits</h1>

                    {loading ? <p>Loading...</p> : credits.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-4xl mb-4">🌿</p>
                            <p className="text-slate-400">No credits yet. Start by creating your first carbon credit!</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {credits.map((c: any) => (
                                <div key={c.id} className="card flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-emerald-300">{c.plant_species || 'Unknown'}</h3>
                                            <span className={`status-badge status-${c.status?.toLowerCase()}`}>{c.status}</span>
                                        </div>
                                        <div className="flex gap-6 text-sm text-slate-400">
                                            <span>Carbon: {c.carbon_value} kg</span>
                                            <span>Points: {c.carbon_points}</span>
                                            <span>Price: ₹{c.price}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-600 mt-1 max-w-[200px] truncate">TX: {c.blockchain_tx_id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
