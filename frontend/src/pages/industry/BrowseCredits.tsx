import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function BrowseCredits() {
    const [credits, setCredits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);

    useEffect(() => {
        loadCredits();
    }, []);

    const loadCredits = () => {
        api.get('/industry/credits/available').then(r => setCredits(r.data.credits || [])).catch(() => { }).finally(() => setLoading(false));
    };

    const handlePurchase = async (creditId: number) => {
        setPurchasing(creditId);
        try {
            // Create order
            const orderRes = await api.post(`/industry/purchase/${creditId}`);
            const { order_id } = orderRes.data;

            // Simulate payment verification (in production, Razorpay checkout would handle this)
            await api.post('/industry/verify-payment', {
                razorpay_order_id: order_id,
                razorpay_payment_id: `pay_sim_${Date.now()}`,
                razorpay_signature: 'simulated',
                credit_id: creditId,
            });

            alert('Purchase successful! Credit ownership transferred.');
            loadCredits();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Purchase failed');
        } finally {
            setPurchasing(null);
        }
    };

    return (
        <div className="flex">
            <Sidebar role="INDUSTRY" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#60a5fa' }}>Browse Carbon Credits</h1>

                    {loading ? <p>Loading...</p> : credits.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-4xl mb-4">🏭</p>
                            <p className="text-slate-400">No credits available for purchase at this time.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {credits.map((c: any) => (
                                <div key={c.id} className="card flex items-center justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-emerald-300 mb-1">{c.plant_species}</h3>
                                        <div className="flex gap-6 text-sm text-slate-400">
                                            <span>Carbon: {c.carbon_value} kg CO₂</span>
                                            <span>Points: {c.carbon_points}</span>
                                            <span>By: {c.creator_name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-2xl font-bold text-emerald-400">₹{c.price}</p>
                                        <button
                                            className="btn-primary"
                                            onClick={() => handlePurchase(c.id)}
                                            disabled={purchasing === c.id}
                                        >
                                            {purchasing === c.id ? 'Processing...' : '🛒 Purchase'}
                                        </button>
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
