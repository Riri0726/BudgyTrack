import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, Landmark, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { mode } = useTheme();
  const { user } = useAuth();
  
  // Database States
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Accounts
      const { data: accs, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (accErr) throw accErr;
      setAccounts(accs || []);

      // 2. Fetch Categories (to sum budget limits)
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      if (catErr) throw catErr;
      setCategories(cats || []);


      // 4. Fetch Transactions
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id, category_id,
          categories ( name )
        `)
        .eq('user_id', user.id);
      if (txErr) throw txErr;
      setTransactions(txs || []);

    } catch (err) {
      console.error('Error loading dashboard stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const budgetLimit = categories.reduce((sum, cat) => sum + parseFloat(cat.budget || 0), 0) || 5000.00;

  // Filter current month transactions
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const actualIncome = monthlyTxs
    .filter(t => t.type === 'income' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const expectedIncome = monthlyTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const actualExpense = monthlyTxs
    .filter(t => t.type === 'expense' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const expectedExpense = monthlyTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const actualSavings = actualIncome - actualExpense;
  const expectedSavings = expectedIncome - expectedExpense;

  const actualPercentage = Math.round((actualExpense / budgetLimit) * 100) || 0;
  const expectedPercentage = Math.round((expectedExpense / budgetLimit) * 100) || 0;
  
  let alertBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-555';
  let alertTitle = 'Looking Good!';
  let alertMessage = `You've spent ${actualPercentage}% of your monthly limit (₱${actualExpense.toFixed(2)} actual / ₱${expectedExpense.toFixed(2)} expected). You're under control!`;
  let alertColor = 'text-emerald-550';

  if (expectedPercentage >= 100) {
    alertBg = 'bg-rose-500/10 border-rose-500/20 text-rose-555';
    alertTitle = 'Ooh! Planning Alert!';
    alertMessage = `Your expected monthly expenses (₱${expectedExpense.toFixed(2)}) will exceed your budget by ₱${(expectedExpense - budgetLimit).toFixed(2)} (${expectedPercentage}% expected). Plan your upcoming costs carefully!`;
    alertColor = 'text-rose-555';
  } else if (expectedPercentage >= 75) {
    alertBg = 'bg-amber-500/10 border-amber-500/20 text-amber-555';
    alertTitle = 'Almost There (Expected)!';
    alertMessage = `Your expected monthly expenses are at ${expectedPercentage}% of your budget limit. Current actual spending is ${actualPercentage}%.`;
    alertColor = 'text-amber-550';
  }

  // Get Top Expenses
  const topExpenses = [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Group weekly data dynamically
  const getWeeklyChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(day => ({ name: day, actualIncome: 0, plannedIncome: 0, actualExpense: 0, plannedExpense: 0 }));
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate >= oneWeekAgo && tDate <= now) {
        const dayName = days[tDate.getDay()];
        const entry = data.find(d => d.name === dayName);
        if (entry) {
          if (t.type === 'income') {
            if (t.status === 'confirmed') entry.actualIncome += parseFloat(t.amount);
            else entry.plannedIncome += parseFloat(t.amount);
          } else {
            if (t.status === 'confirmed') entry.actualExpense += parseFloat(t.amount);
            else entry.plannedExpense += parseFloat(t.amount);
          }
        }
      }
    });
    return data;
  };

  const chartData = getWeeklyChartData();
  const axisColor = mode === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = mode === 'dark' ? '#283144' : '#e2e8f0';

  const getAccountIcon = (type) => {
    if (type === 'bank') return Landmark;
    if (type === 'ewallet') return Smartphone;
    return Wallet;
  };


  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Overview</h1>
          <p className="text-text-muted mt-1">Real-time tracking of actual vs planned (expected) transactions.</p>
        </div>
      </header>

      {/* Dynamic Budget Alert status */}
      <div className={`p-5 rounded-2xl border flex items-start gap-4 ${alertBg}`}>
        <div className="p-3 bg-white/5 rounded-xl mt-1">
          <Sparkles className={alertColor} size={24} />
        </div>
        <div>
          <h4 className="font-bold text-lg">{alertTitle}</h4>
          <p className="text-text-primary mt-1 text-sm leading-relaxed">{alertMessage}</p>
        </div>
      </div>

      {/* Expected vs Actual Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Balance */}
        <div className="glass rounded-2xl p-6 relative">
          <p className="text-text-muted text-sm font-semibold mb-1">Total Assets</p>
          <h3 className="text-2xl font-bold text-text-primary">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-text-muted mt-2">Active accounts balance</p>
          <div className="p-2 bg-surface rounded-xl absolute right-6 top-6 border border-border">
            <Wallet className="text-text-muted" size={20} />
          </div>
        </div>
        
        {/* Income */}
        <div className="glass rounded-2xl p-6 relative">
          <p className="text-text-muted text-sm font-semibold mb-1">Monthly Income</p>
          <h3 className="text-2xl font-bold text-emerald-550">₱{actualIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-text-muted mt-2">Expected: ₱{expectedIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <div className="p-2 bg-surface rounded-xl absolute right-6 top-6 border border-border">
            <ArrowUpRight className="text-emerald-500" size={20} />
          </div>
        </div>

        {/* Expenses */}
        <div className="glass rounded-2xl p-6 relative">
          <p className="text-text-muted text-sm font-semibold mb-1">Monthly Expenses</p>
          <h3 className="text-2xl font-bold text-rose-500">₱{actualExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-text-muted mt-2">Expected: ₱{expectedExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <div className="p-2 bg-surface rounded-xl absolute right-6 top-6 border border-border">
            <ArrowDownRight className="text-rose-500" size={20} />
          </div>
        </div>

        {/* Savings */}
        <div className="glass rounded-2xl p-6 relative">
          <p className="text-text-muted text-sm font-semibold mb-1">Net Savings</p>
          <h3 className="text-2xl font-bold text-sky-500">₱{actualSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          <p className="text-xs text-text-muted mt-2">Expected: ₱{expectedSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <div className="p-2 bg-surface rounded-xl absolute right-6 top-6 border border-border">
            <TrendingUp className="text-sky-500" size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Graph */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6 text-text-primary">Weekly Cashflow (Actual vs Planned)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-primary)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="actualIncome" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual Income" />
                <Bar dataKey="plannedIncome" fill="#10b981" fillOpacity={0.4} radius={[4, 4, 0, 0]} name="Planned Income" />
                <Bar dataKey="actualExpense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Actual Expenses" />
                <Bar dataKey="plannedExpense" fill="#f43f5e" fillOpacity={0.4} radius={[4, 4, 0, 0]} name="Planned Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expenses */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-text-primary">Top Expenses</h3>
          <div className="space-y-4">
            {topExpenses.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">No expenses recorded yet.</p>
            ) : (
              topExpenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-surface transition-colors border border-border">
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary">{exp.title}</h4>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-text-muted">{exp.categories?.name || 'Uncategorized'}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                        exp.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-550'
                      }`}>{exp.status}</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-500">-₱{exp.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Accounts List */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6 text-text-primary">Your Wallets (Accounts)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc.type);
              return (
                <div key={acc.id} className="flex items-center space-x-4 p-4 rounded-xl border border-border bg-surface hover:bg-card transition-all">
                  <div className="p-3 bg-card rounded-xl border border-border">
                    <Icon className="text-text-muted" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{acc.name}</h4>
                    <p className="text-xs text-text-muted uppercase tracking-wider text-[9px] font-bold mt-0.5">{acc.type}</p>
                    <p className="font-bold text-base mt-1 text-text-primary">₱{parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
