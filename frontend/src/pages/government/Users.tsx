import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

export default function GovUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/government/users').then(r => setUsers(r.data.users || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex">
            <Sidebar role="GOVERNMENT" />
            <div className="ml-[260px] p-8 flex-1">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h1 className="text-3xl font-bold mb-8" style={{ color: '#a78bfa' }}>All Users</h1>
                    {loading ? <p>Loading...</p> : (
                        <div className="card overflow-x-auto">
                            <table>
                                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Points</th><th>Joined</th></tr></thead>
                                <tbody>
                                    {users.map((u: any) => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td className="font-medium">{u.name}</td>
                                            <td className="text-slate-400">{u.email}</td>
                                            <td><span className={`status-badge ${u.role === 'USER' ? 'status-listed' : u.role === 'INDUSTRY' ? 'status-sold' : 'status-pending'}`}>{u.role}</span></td>
                                            <td>₹{u.balance || 0}</td>
                                            <td>{u.carbon_points || 0}</td>
                                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
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
