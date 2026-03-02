import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function GovCredits() {
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/government/credits').then(r => setCredits(r.data.credits || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex">
            <Sidebar role="GOVERNMENT" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#a78bfa' }}>All Credits</h1>
                    {loading ? <p>Loading...</p> : (
                        <div className="card overflow-x-auto">
                            <table>
                                <thead><tr><th>ID</th><th>Species</th><th>Carbon</th><th>Price</th><th>Creator</th><th>Owner</th><th>Status</th><th>Blockchain TX</th></tr></thead>
                                <tbody>
                                    {credits.map((c: any) => (
                                        <tr key={c.id}>
                                            <td>{c.id}</td>
                                            <td>{c.plant_species}</td>
                                            <td>{c.carbon_value} kg</td>
                                            <td>₹{c.price}</td>
                                            <td>{c.creator_name}</td>
                                            <td>{c.owner_name}</td>
                                            <td><span className={`status-badge status-${c.status?.toLowerCase()}`}>{c.status}</span></td>
                                            <td className="text-xs text-slate-500 max-w-[150px] truncate">{c.blockchain_tx_id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
