import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/user/Dashboard';
import CreateCredit from './pages/user/CreateCredit';
import MyCredits from './pages/user/MyCredits';
import Wallet from './pages/user/Wallet';
import IndustryDashboard from './pages/industry/Dashboard';
import BrowseCredits from './pages/industry/BrowseCredits';
import PollutionReport from './pages/industry/PollutionReport';
import GovDashboard from './pages/government/Dashboard';
import GovUsers from './pages/government/Users';
import GovCredits from './pages/government/Credits';
import GovTransactions from './pages/government/Transactions';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: string }) {
    const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== role) return <Navigate to="/login" />;
    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* User routes */}
            <Route path="/user/dashboard" element={<ProtectedRoute role="USER"><UserDashboard /></ProtectedRoute>} />
            <Route path="/user/create-credit" element={<ProtectedRoute role="USER"><CreateCredit /></ProtectedRoute>} />
            <Route path="/user/credits" element={<ProtectedRoute role="USER"><MyCredits /></ProtectedRoute>} />
            <Route path="/user/wallet" element={<ProtectedRoute role="USER"><Wallet /></ProtectedRoute>} />

            {/* Industry routes */}
            <Route path="/industry/dashboard" element={<ProtectedRoute role="INDUSTRY"><IndustryDashboard /></ProtectedRoute>} />
            <Route path="/industry/browse" element={<ProtectedRoute role="INDUSTRY"><BrowseCredits /></ProtectedRoute>} />
            <Route path="/industry/pollution-report" element={<ProtectedRoute role="INDUSTRY"><PollutionReport /></ProtectedRoute>} />

            {/* Government routes */}
            <Route path="/government/dashboard" element={<ProtectedRoute role="GOVERNMENT"><GovDashboard /></ProtectedRoute>} />
            <Route path="/government/users" element={<ProtectedRoute role="GOVERNMENT"><GovUsers /></ProtectedRoute>} />
            <Route path="/government/credits" element={<ProtectedRoute role="GOVERNMENT"><GovCredits /></ProtectedRoute>} />
            <Route path="/government/transactions" element={<ProtectedRoute role="GOVERNMENT"><GovTransactions /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}
