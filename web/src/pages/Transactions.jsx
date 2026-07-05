import { useState, useEffect } from 'react';
import { Search, Plus, ArrowDownRight, ArrowUpRight, X, ArrowUpDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Sorting states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('confirmed');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (user) {
      initializeAndFetch();
    }
  }, [user]);

  const initializeAndFetch = async () => {
    setLoading(true);
    try {
      // 1. Fetch Accounts
      let { data: fetchedAccounts, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (accErr) throw accErr;
      
      setAccounts(fetchedAccounts || []);
      if (fetchedAccounts && fetchedAccounts.length > 0) setAccountId(fetchedAccounts[0].id);

      // 2. Fetch Categories
      let { data: fetchedCategories, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      if (catErr) throw catErr;

      setCategories(fetchedCategories || []);
      const defaultCat = (fetchedCategories || []).find(c => c.type === 'expense');
      if (defaultCat) setCategoryId(defaultCat.id);

      // 3. Fetch Transactions
      await fetchTransactions();
    } catch (err) {
      console.error('Initialization error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id, category_id,
          accounts ( name ),
          categories ( name )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Fetch transactions error:', err.message);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!title || !amount || !accountId || !categoryId) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          title,
          amount: parseFloat(amount),
          type,
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
      
      await fetchTransactions();
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
      await fetchTransactions();
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

  // Search + Filtering
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (tx.categories?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || tx.categories?.name === filterCategory;

    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  // Sorting
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
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
          <h1 className="text-3xl font-bold text-text-primary">Transactions</h1>
          <p className="text-text-muted mt-1">Manage, adjust, and plan future budget items.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Add New
        </button>
      </header>

      {/* Filtering Controls */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card"
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed (Actual)</option>
          <option value="planned">Planned (Expected)</option>
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-surface border border-border rounded-xl py-2 px-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Transaction Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">Loading transactions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-text-muted text-sm border-b border-border">
                  <th className="px-6 py-4 font-medium">Transaction</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Wallet</th>
                  <th className="px-6 py-4 font-medium cursor-pointer select-none" onClick={() => requestSort('date')}>
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <ArrowUpDown size={14} className="text-text-muted" />
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium cursor-pointer select-none text-right" onClick={() => requestSort('amount')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Amount</span>
                      <ArrowUpDown size={14} className="text-text-muted" />
                    </div>
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface text-text-muted border border-border'}`}>
                          {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div>
                          <span className="font-semibold text-text-primary block">{tx.title}</span>
                          {tx.is_recurring && (
                            <span className="flex items-center text-[10px] text-text-muted mt-0.5">
                              <RefreshCw size={10} className="mr-1" />
                              Subscription
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">{tx.categories?.name || 'Uncategorized'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface text-text-primary border border-border">
                        {tx.accounts?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">{tx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                        tx.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {tx.status === 'planned' && (
                        <button
                          onClick={() => handleConfirmStatus(tx.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center inline-flex shadow-sm"
                        >
                          <CheckCircle2 size={12} className="mr-1" />
                          {tx.type === 'expense' ? 'Mark Paid' : 'Mark Recv'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-bold text-text-primary">Add Transaction</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { 
                      setType('expense'); 
                      const expenseCat = categories.find(c => c.type === 'expense');
                      if (expenseCat) setCategoryId(expenseCat.id);
                    }}
                    className={`py-2.5 rounded-xl font-semibold border text-center transition-all ${
                      type === 'expense' 
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-500 font-bold' 
                        : 'border-border text-text-muted hover:bg-surface'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setType('income'); 
                      const incomeCat = categories.find(c => c.type === 'income');
                      if (incomeCat) setCategoryId(incomeCat.id);
                    }}
                    className={`py-2.5 rounded-xl font-semibold border text-center transition-all ${
                      type === 'income' 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 font-bold' 
                        : 'border-border text-text-muted hover:bg-surface'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly Groceries"
                  required
                  className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
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
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Category</label>
                  <select 
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card text-sm h-11"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.filter(cat => cat.type === type).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Wallet</label>
                  <select 
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card text-sm h-11"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status and Recurring selectors */}
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 mt-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Status</label>
                  <select 
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 [&>option]:bg-card text-sm h-11"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="planned">Planned (Expected)</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center space-x-2 text-sm text-text-primary font-semibold mb-2 h-11 select-none">
                    <input 
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded border-border bg-surface text-primary focus:ring-primary focus:ring-opacity-25"
                    />
                    <span>Subscription?</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold mt-4 transition-colors shadow-sm"
              >
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
