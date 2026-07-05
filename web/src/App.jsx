import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, TrendingUp, SlidersHorizontal, Settings as SettingsIcon, LogOut, FolderHeart } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Budget from './pages/Budget';
import Settings from './pages/Settings';
import Wallets from './pages/Wallets';

function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budget Pockets', path: '/wallets', icon: FolderHeart },
    { name: 'Expenses', path: '/expenses', icon: TrendingUp },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Budget limits', path: '/budget', icon: SlidersHorizontal },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 h-screen bg-surface border-r border-border flex flex-col transition-all">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">
          BudgyTrack
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-muted hover:bg-background hover:text-text-primary'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary' : ''} />
              <span className="font-semibold text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <button 
          onClick={signOut}
          className="flex items-center space-x-3 px-4 py-3 w-full text-text-muted hover:bg-background hover:text-danger rounded-xl transition-all duration-150 cursor-pointer"
        >
          <LogOut size={18} />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-background overflow-hidden text-text-primary transition-all">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-background">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/income" element={<Income />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
