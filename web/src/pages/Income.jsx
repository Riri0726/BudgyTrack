import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ArrowUpRight, X, ArrowUpDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Income() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('confirmed');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Income Categories
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'income');
      if (catErr) throw catErr;
      setCategories(cats || []);
      if (cats && cats.length > 0) setCategoryId(cats[0].id);

      // 2. Fetch Accounts
      const { data: accs, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (accErr) throw accErr;
      setAccounts(accs || []);
      if (accs && accs.length > 0) setAccountId(accs[0].id);

      // 3. Fetch Income (transactions table)
      await fetchIncomes();
    } catch (err) {
      console.error('Error fetching initial income page data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id, category_id,
          accounts ( name ),
          categories ( name )
        `)
        .eq('user_id', user.id)
        .eq('type', 'income')
        .order('date', { ascending: false });

      if (error) throw error;
      setIncomes(data || []);
    } catch (err) {
      console.error('Error fetching incomes:', err.message);
    }
  };

  // Target calculations
  const monthlyIncomeTarget = 25000.00; // PHP target default
  const actualIncome = incomes.filter(i => i.status === 'confirmed').reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const expectedIncome = incomes.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const actualPercentReached = Math.min(Math.round((actualIncome / monthlyIncomeTarget) * 100), 100) || 0;
  const expectedPercentReached = Math.min(Math.round((expectedIncome / monthlyIncomeTarget) * 100), 100) || 0;

  // Dynamic status check
  let statusCardBg = 'bg-surface text-text-muted border-border';
  let statusText = 'Keep Going!';
  let statusMessage = `You've achieved ${actualPercentReached}% of your target. Expected total is ${expectedPercentReached}%.`;

  if (actualPercentReached >= 100) {
    statusCardBg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    statusText = 'Target Achieved!';
    statusMessage = 'Awesome! You have met or exceeded your monthly earning goal!';
  } else if (expectedPercentReached >= 100) {
    statusCardBg = 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
    statusText = 'Earning Goal Expected!';
    statusMessage = 'Your expected monthly earnings will meet your targets. Keep pushing!';
  }

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!title || !amount || !categoryId || !accountId) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          title,
          amount: parseFloat(amount),
          type: 'income',
          date,
          status,
          is_recurring: isRecurring,
          account_id: accountId,
          category_id: categoryId,
        }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setIsRecurring(false);
      setStatus('confirmed');
      
      await fetchIncomes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmStatus = async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;
      await fetchIncomes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setIncomes(incomes.filter((inc) => inc.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const requestSort = (key) => {
    let order = 'asc';
    if (sortBy === key && sortOrder === 'asc') {
      order = 'desc';
    }
    setSortBy(key);
    setSortOrder(order);
  };

  // Filter logic
  const filteredIncomes = incomes.filter(inc => {
    const matchesSearch = inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inc.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || inc.categories?.name === filterCategory;
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort logic
  const sortedIncomes = [...filteredIncomes].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortBy === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    return 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Income</h1>
          <p className="text-text-muted mt-1">Manage and track your inflows.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Add Income
        </button>
      </header>

      {/* Filter Options */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search income..."
            className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 [&>option]:bg-card"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="planned">Planned (Expected)</option>
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 [&>option]:bg-card"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Records table */}
        <div className="glass rounded-2xl overflow-hidden lg:col-span-2">
          {loading ? (
            <div className="p-12 text-center text-text-muted">Loading income...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface text-text-muted text-sm border-b border-border">
                    <th className="px-6 py-4 font-medium">Income source</th>
                    <th className="px-6 py-4 font-medium">Account</th>
                    <th className="px-6 py-4 font-medium cursor-pointer select-none" onClick={() => requestSort('date')}>
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        <ArrowUpDown size={14} className="text-text-muted" />
                      </div>
                    </th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right cursor-pointer select-none" onClick={() => requestSort('amount')}>
                      <div className="flex items-center justify-end space-x-1">
                        <span>Amount</span>
                        <ArrowUpDown size={14} className="text-text-muted" />
                      </div>
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedIncomes.map((inc) => (
                    <tr key={inc.id} className="hover:bg-surface transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">{inc.title}</span>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-xs text-emerald-500 font-semibold">{inc.categories?.name || 'Uncategorized'}</span>
                            {inc.is_recurring && (
                              <span className="flex items-center text-[9px] text-text-muted">
                                <RefreshCw size={9} className="mr-0.5" />
                                Subscription
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface text-text-primary border border-border">
                          {inc.accounts?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted text-sm">{inc.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          inc.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-550">
                        +₱{inc.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {inc.status === 'planned' && (
                          <button
                            onClick={() => handleConfirmStatus(inc.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors inline-flex items-center shadow-sm"
                          >
                            <CheckCircle2 size={12} className="mr-1" />
                            Mark Recv
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inc.id)}
                          className="text-text-muted hover:text-danger p-1.5 rounded-lg hover:bg-surface transition-colors inline-flex"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Gauge Card */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-text-primary self-start mb-6">Inflow Target</h3>
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  className="stroke-border fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  className="stroke-emerald-500 fill-none transition-all duration-550"
                  strokeWidth="8"
                  strokeDasharray={464}
                  strokeDashoffset={464 - (464 * actualPercentReached) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-text-primary block">{actualPercentReached}%</span>
                <span className="text-xs text-text-muted block mt-1">Reached</span>
              </div>
            </div>
            <div className="text-center mt-6">
              <p className="text-sm text-text-muted">Total Monthly Earnings</p>
              <h4 className="text-xl font-bold mt-1 text-text-primary">
                ₱{actualIncome.toFixed(2)} <span className="text-text-muted text-sm font-normal">of</span> ₱{monthlyIncomeTarget.toFixed(2)}
              </h4>
              <p className="text-xs text-text-muted mt-1">Expected (incl. planned): ₱{expectedIncome.toFixed(2)}</p>
            </div>
          </div>

          {/* Goal status banner */}
          <div className={`p-5 rounded-2xl border ${statusCardBg}`}>
            <h4 className="font-bold text-base">{statusText}</h4>
            <p className="text-xs text-text-primary mt-1 leading-relaxed">{statusMessage}</p>
          </div>
        </div>
      </div>

      {/* Add Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-bold text-text-primary">Add Income</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddIncome} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Salary"
                  required
                  className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Category</label>
                  <select
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 [&>option]:bg-card text-sm h-11"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Account</label>
                  <select
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 [&>option]:bg-card text-sm h-11"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Status</label>
                  <select 
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-emerald-500/50 [&>option]:bg-card text-sm h-11"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center space-x-2 text-sm text-text-primary font-semibold mb-2 h-11 select-none">
                    <input 
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded border-border bg-surface text-emerald-500 focus:ring-emerald-500 focus:ring-opacity-25"
                    />
                    <span>Subscription?</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold mt-4 transition-colors shadow-sm"
              >
                Save Income
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
