import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function CreateCredit() {
    const [plantDetails, setPlantDetails] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('plant_details', plantDetails);
            if (image) formData.append('plant_image', image);

            const res = await api.post('/user/credits', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create credit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex">
            <Sidebar role="USER" />
            <div className="ml-[260px] p-8 flex-1 max-w-4xl">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8 gradient-text">Create Carbon Credit</h1>

                    {result ? (
                        <div className="card">
                            <h2 className="text-xl font-semibold text-emerald-400 mb-4">✅ Credit Created Successfully!</h2>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div><p className="text-slate-500 text-xs">Species</p><p className="text-emerald-300 font-medium">{result.ml_prediction.species}</p></div>
                                <div><p className="text-slate-500 text-xs">Carbon Value</p><p className="text-emerald-300 font-medium">{result.ml_prediction.carbon_value} kg CO₂</p></div>
                                <div><p className="text-slate-500 text-xs">Points Earned</p><p className="text-emerald-300 font-medium">{result.ml_prediction.carbon_points}</p></div>
                                <div><p className="text-slate-500 text-xs">Confidence</p><p className="text-emerald-300 font-medium">{(result.ml_prediction.confidence * 100).toFixed(0)}%</p></div>
                                <div><p className="text-slate-500 text-xs">Blockchain TX</p><p className="text-emerald-300 font-medium text-xs break-all">{result.credit.blockchain_tx_id}</p></div>
                                <div><p className="text-slate-500 text-xs">Status</p><p className="text-emerald-300 font-medium">{result.credit.status}</p></div>
                            </div>
                            <button onClick={() => navigate('/user/credits')} className="btn-primary">View My Credits →</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
                            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Plant Name</label>
                                <input type="text" value={plantDetails} onChange={e => setPlantDetails(e.target.value)} placeholder="e.g. Oak Tree" required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" />
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 mb-1 block">Plant Image (Required for Verification)</label>
                                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors">
                                    <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20" required />
                                    <p className="text-xs text-slate-500 mt-2">Upload a clear photo of the plant for AI verification.</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                                <h3 className="text-sm font-semibold text-emerald-400 mb-2">🤖 AI Analysis will calculate:</h3>
                                <ul className="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                                    <li>Species Verification (Image matches Name?)</li>
                                    <li>Health Score & Age Estimation</li>
                                    <li>Exact Carbon Sequestration Rate</li>
                                    <li>Fair Market Price (₹) based on Carbon Output</li>
                                </ul>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? '🔄 Verifying & Analyzing...' : '🌱 Analyze & Create Credit'}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
