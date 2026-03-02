import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, logout } from '../store';

interface SidebarProps {
    role: 'USER' | 'INDUSTRY' | 'GOVERNMENT';
}

const navItems = {
    USER: [
        { path: '/user/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/user/create-credit', label: 'Create Credit', icon: '🌱' },
        { path: '/user/credits', label: 'My Credits', icon: '🏷️' },
        { path: '/user/wallet', label: 'Wallet', icon: '💰' },
    ],
    INDUSTRY: [
        { path: '/industry/dashboard', label: 'Dashboard', icon: '🏭' },
        { path: '/industry/browse', label: 'Browse Credits', icon: '🛒' },
        { path: '/industry/pollution-report', label: 'Pollution Report', icon: '📊' },
    ],
    GOVERNMENT: [
        { path: '/government/dashboard', label: 'Dashboard', icon: '🏛️' },
        { path: '/government/users', label: 'Users', icon: '👥' },
        { path: '/government/credits', label: 'Credits', icon: '📋' },
        { path: '/government/transactions', label: 'Transactions', icon: '📜' },
    ],
};

export default function Sidebar({ role }: SidebarProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((s: RootState) => s.auth.user);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    return (
        <div className="sidebar fixed left-0 top-0 flex flex-col">
            <Link to="/" className="text-xl font-bold mb-1 !text-emerald-400 no-underline px-3">
                🌿 GREEN COINS
            </Link>
            <p className="text-xs text-slate-500 px-4 mb-6">{role} Portal</p>

            {user && (
                <div className="px-4 mb-6">
                    <p className="text-sm font-medium text-slate-300">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                </div>
            )}

            <nav className="flex-1 flex flex-col gap-1">
                {navItems[role].map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={location.pathname === item.path ? 'active' : ''}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <button onClick={handleLogout} className="mt-auto text-red-400 hover:!text-red-300 hover:!bg-red-500/10">
                <span>🚪</span>
                <span>Logout</span>
            </button>
        </div>
    );
}
