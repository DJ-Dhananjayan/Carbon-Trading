import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { setCredentials } from '../store';
import api from '../api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
            const role = res.data.user.role;
            navigate(role === 'USER' ? '/user/dashboard' : role === 'INDUSTRY' ? '/industry/dashboard' : '/government/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f17 50%, #0a0f1a 100%)' }}>
            <motion.div className="card w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Link to="/" className="text-2xl font-bold gradient-text no-underline block text-center mb-2">🌿 GREEN COINS</Link>
                <p className="text-center text-slate-500 mb-8">Sign in to your account</p>

                {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-slate-500 text-sm mt-6">
                    Don't have an account? <Link to="/register" className="text-emerald-400 no-underline hover:underline">Register</Link>
                </p>
            </motion.div>
        </div>
    );
}
