import { useState, useEffect } from 'react';
import { FolderHeart, Landmark, ArrowUpRight, ArrowDownRight, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Wallets() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [initialBalance, setInitialBalance] = useState('');

  // Selected wallet view
  const [selectedWalletId, setSelectedWalletId] = useState('all');

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      // 1. Fetch physical accounts (which we call Wallets in UI)
      const { data: wlts, error: wltErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (wltErr) throw wltErr;
      setWallets(wlts || []);

      // 2. Fetch transactions
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id,
          categories ( name ),
          accounts ( name )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (txErr) throw txErr;
      setTransactions(txs || []);

    } catch (err) {
      console.error('Error fetching wallets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async (e) => {
    e.preventDefault();
    if (!name || !type) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{
          name,
          type,
          balance: parseFloat(initialBalance || 0),
          user_id: user.id
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        const newWallet = data[0];
        setWallets([...wallets, newWallet]);
        
        const amount = parseFloat(initialBalance || 0);
        if (amount > 0) {
          let { data: cats } = await supabase.from('categories').select('id').eq('user_id', user.id).eq('type', 'income').limit(1);
          if (cats && cats.length > 0) {
            await supabase.from('transactions').insert([{
              user_id: user.id,
              title: 'Starting Balance',
              amount: amount,
              type: 'income',
              status: 'confirmed',
              account_id: newWallet.id,
              category_id: cats[0].id,
              date: new Date().toISOString().split('T')[0]
            }]);
          }
        }

        setIsModalOpen(false);
        setName('');
        setType('cash');
        setInitialBalance('');
        
        fetchWalletData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteWallet = async (id) => {
    if (!confirm('Are you sure you want to delete this wallet? Note: If this wallet has transactions tied to it, you must delete those transactions first.')) return;
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setWallets(wallets.filter(w => w.id !== id));
      if (selectedWalletId === id) setSelectedWalletId('all');
    } catch (err) {
      alert(err.message);
    }
  };

  // Group calculations
  const getWalletStats = (walletId) => {
    const wTxs = transactions.filter(t => t.account_id === walletId);
    const spent = wTxs.filter(t => t.type === 'expense' && t.status === 'confirmed').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const income = wTxs.filter(t => t.type === 'income' && t.status === 'confirmed').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    // The budget is the actual balance
    const balance = income - spent;
    return { spent, income, balance };
  };

  const overallSpent = transactions.filter(t => t.type === 'expense' && t.status === 'confirmed').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const overallIncome = transactions.filter(t => t.type === 'income' && t.status === 'confirmed').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalBalance = overallIncome - overallSpent;

  // Filter transactions by selected wallet
  const filteredTxs = transactions.filter(tx => {
    if (selectedWalletId === 'all') return true;
    return tx.account_id === selectedWalletId;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Wallets</h1>
          <p className="text-text-muted mt-1">Your unified accounts. The available budget is your actual balance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Create Wallet
        </button>
      </header>

      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading wallets...</div>
      ) : (
        <>
          {/* Overall stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-2xl p-6">
              <p className="text-text-muted text-sm font-semibold mb-1">Total Available Budget</p>
              <h3 className="text-2xl font-bold text-text-primary">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs text-text-muted mt-1">Combined balance across all wallets</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-text-muted text-sm font-semibold mb-1">Overall Inflow</p>
              <h3 className="text-2xl font-bold text-emerald-500">₱{overallIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs text-text-muted mt-1">Consolidated confirmed income</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-text-muted text-sm font-semibold mb-1">Overall Spent</p>
              <h3 className="text-2xl font-bold text-rose-500">₱{overallSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs text-text-muted mt-1">Consolidated confirmed expenses</p>
            </div>
          </div>

          {/* Active Wallets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall filter card */}
            <button
              onClick={() => setSelectedWalletId('all')}
              className={`p-6 rounded-2xl border text-left transition-all ${
                selectedWalletId === 'all' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:bg-surface'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-base text-text-primary">All Wallets</h4>
                <FolderHeart size={18} className="text-text-muted" />
              </div>
              <p className="text-2xl font-black text-text-primary">₱{totalBalance.toFixed(2)}</p>
              <p className="text-xs text-text-muted mt-2">Overall Available Balance</p>
            </button>

            {/* Custom physical/virtual wallets */}
            {wallets.map((wlt) => {
              const stats = getWalletStats(wlt.id);
              const isSelected = selectedWalletId === wlt.id;

              return (
                <div
                  key={wlt.id}
                  onClick={() => setSelectedWalletId(wlt.id)}
                  className={`p-6 rounded-2xl border text-left relative flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:bg-surface'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-base text-text-primary">{wlt.name}</h4>
                      <div className="flex items-center space-x-2">
                        <Landmark size={14} className="text-text-muted" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWallet(wlt.id);
                          }}
                          className="text-text-muted hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col mb-4">
                      <span className="text-2xl font-black text-text-primary">₱{stats.balance.toFixed(2)}</span>
                      <span className="text-xs text-text-muted">Available Budget</span>
                    </div>

                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">In</span>
                      <span className="text-xs text-emerald-500 font-semibold">+₱{stats.income.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Out</span>
                      <span className="text-xs text-rose-500 font-semibold">-₱{stats.spent.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ledger details list for selected wallet */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">
              Ledger Feed: {selectedWalletId === 'all' ? 'All Wallets' : (wallets.find(w => w.id === selectedWalletId)?.name || 'Wallet')}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface text-text-muted text-sm border-b border-border">
                    <th className="px-6 py-3 font-medium">Transaction</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-text-muted text-sm">
                        No transactions registered under this wallet.
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface/50 transition-colors text-sm">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1.5 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface text-text-muted border border-border'}`}>
                              {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>
                            <span className="font-semibold text-text-primary">{tx.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-muted">{tx.categories?.name || 'Uncategorized'}</td>
                        <td className="px-6 py-4 text-text-muted">{tx.date}</td>
                        <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'income' ? '+' : '-'}₱{parseFloat(tx.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Wallet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-bold text-text-primary">Create Wallet</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddWallet} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Wallet Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Travel Fund, BPI Checking"
                  required
                  className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Account Type</label>
                  <select 
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm [&>option]:bg-card h-11"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="cash">Cash / Physical</option>
                    <option value="bank">Bank Account</option>
                    <option value="ewallet">E-Wallet (GCash, Maya)</option>
                    <option value="card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Current Budget (₱)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-surface border border-border rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary/50 text-sm h-11"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold mt-4 transition-colors shadow-sm"
              >
                Save Wallet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
