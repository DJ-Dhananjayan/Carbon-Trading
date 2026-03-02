import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CarbonTree from '../components/CarbonTree';
import api from '../api';

export default function HomePage() {
    const [carbonPoints, setCarbonPoints] = useState(50);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/user/carbon-data').then(r => setCarbonPoints(r.data.total_points || 50)).catch(() => { });
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0f1a] overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 glass px-8 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold gradient-text no-underline">🌿 GREEN COINS</Link>
                <div className="flex gap-4">
                    <Link to="/login" className="btn-secondary text-sm no-underline">Login</Link>
                    <Link to="/register" className="btn-primary text-sm no-underline">Register</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-28 pb-16 px-8 flex flex-col lg:flex-row items-center gap-8 max-w-7xl mx-auto min-h-screen">
                <motion.div
                    className="flex-1"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
                        <span className="gradient-text">Trade Carbon.</span><br />
                        <span className="text-slate-200">Save the Planet.</span>
                    </h1>
                    <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">
                        GREEN COINS is a blockchain-powered carbon trading platform that connects
                        individuals, industries, and governments to create a sustainable future.
                    </p>
                    <div className="flex gap-4 flex-wrap">
                        <Link to="/register" className="btn-primary text-lg px-8 py-4 no-underline">Get Started →</Link>
                        <Link to="/login" className="btn-secondary text-lg px-8 py-4 no-underline">Sign In</Link>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-8 mt-12">
                        {[
                            { label: 'Carbon Points', value: carbonPoints },
                            { label: 'Active Users', value: '100+' },
                            { label: 'Credits Traded', value: '500+' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.2 }}>
                                <p className="text-3xl font-bold text-emerald-400">{s.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    className="flex-1 h-[500px]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                >
                    <CarbonTree carbonPoints={carbonPoints} />
                </motion.div>
            </section>

            {/* Features */}
            <section className="py-20 px-8 max-w-7xl mx-auto">
                <motion.h2
                    className="text-4xl font-bold text-center mb-16 gradient-text"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    How It Works
                </motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: '🌱', title: 'Create Credits', desc: 'Plant trees and create verified carbon credits backed by ML analysis and blockchain.' },
                        { icon: '🔗', title: 'Trade Securely', desc: 'Buy and sell carbon credits with Razorpay payments and Hyperledger Fabric blockchain.' },
                        { icon: '🏛️', title: 'Full Transparency', desc: 'Government oversight with real-time dashboards for complete transparency.' },
                    ].map((f, i) => (
                        <motion.div
                            key={i}
                            className="card text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                        >
                            <span className="text-5xl block mb-4">{f.icon}</span>
                            <h3 className="text-xl font-bold text-emerald-400 mb-3">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Roles */}
            <section className="py-20 px-8 max-w-7xl mx-auto">
                <h2 className="text-4xl font-bold text-center mb-16 gradient-text">Three Portals</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: '👤', title: 'User', desc: 'Create carbon credits, track your plants, earn from carbon offsets.', color: '#10b981' },
                        { icon: '🏭', title: 'Industry', desc: 'Browse and purchase carbon credits to offset your emissions.', color: '#3b82f6' },
                        { icon: '🏛️', title: 'Government', desc: 'Monitor all platform activity, users, credits, and transactions.', color: '#a855f7' },
                    ].map((r, i) => (
                        <motion.div
                            key={i}
                            className="card text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                            style={{ borderColor: `${r.color}20` }}
                        >
                            <span className="text-5xl block mb-4">{r.icon}</span>
                            <h3 className="text-xl font-bold mb-3" style={{ color: r.color }}>{r.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-emerald-900/30 py-8 px-8 text-center text-slate-500 text-sm">
                <p>© 2024 GREEN COINS — Blockchain Carbon Trading Platform</p>
            </footer>
        </div>
    );
}
