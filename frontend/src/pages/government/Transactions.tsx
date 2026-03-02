import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function GovTransactions() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/government/transactions').then(r => setTransactions(r.data.transactions || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex">
            <Sidebar role="GOVERNMENT" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#a78bfa' }}>All Transactions</h1>
                    {loading ? <p>Loading...</p> : (
                        <div className="card overflow-x-auto">
                            <table>
                                <thead><tr><th>ID</th><th>Type</th><th>Species</th><th>Carbon</th><th>From</th><th>To</th><th>Amount</th><th>Blockchain TX</th><th>Date</th></tr></thead>
                                <tbody>
                                    {transactions.map((t: any) => (
                                        <tr key={t.id}>
                                            <td>{t.id}</td>
                                            <td><span className={`status-badge ${t.tx_type === 'CREATION' ? 'status-listed' : 'status-sold'}`}>{t.tx_type}</span></td>
                                            <td>{t.plant_species}</td>
                                            <td>{t.carbon_value} kg</td>
                                            <td>{t.from_name}</td>
                                            <td>{t.to_name}</td>
                                            <td>₹{t.amount || 0}</td>
                                            <td className="text-xs text-slate-500 max-w-[150px] truncate">{t.blockchain_tx_id}</td>
                                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
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
