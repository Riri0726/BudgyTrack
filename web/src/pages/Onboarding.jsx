import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Landmark, ArrowRight, WalletCards } from 'lucide-react';

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const [walletName, setWalletName] = useState('My Cash');
  const [walletType, setWalletType] = useState('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    if (!walletName || !walletType) return;
    setLoading(true);

    try {
      // 1. Seed the default categories quietly in the background
      const { data: newCats, error: catErr } = await supabase
        .from('categories')
        .insert([
          { user_id: user.id, name: 'Food', type: 'expense', budget: 5000.00 },
          { user_id: user.id, name: 'Rent', type: 'expense', budget: 12000.00 },
          { user_id: user.id, name: 'Salary', type: 'income', budget: 0.00 },
          { user_id: user.id, name: 'Initial Balance', type: 'income', budget: 0.00 }
        ])
        .select();
      if (catErr) throw catErr;

      // 2. Create the Wallet
      const { data: newWallet, error: wltErr } = await supabase
        .from('accounts')
        .insert([{
          user_id: user.id,
          name: walletName,
          type: walletType,
          balance: parseFloat(initialBalance || 0)
        }])
        .select();
      if (wltErr) throw wltErr;

      // 3. Create the Initial Balance Transaction if > 0
      const amount = parseFloat(initialBalance || 0);
      if (amount > 0 && newWallet && newCats) {
        const incomeCat = newCats.find(c => c.name === 'Initial Balance');
        await supabase.from('transactions').insert([{
          user_id: user.id,
          title: 'Starting Balance',
          amount: amount,
          type: 'income',
          status: 'confirmed',
          account_id: newWallet[0].id,
          category_id: incomeCat ? incomeCat.id : newCats[0].id,
          date: new Date().toISOString().split('T')[0]
        }]);
      }

      // Finish Onboarding
      completeOnboarding();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-700 text-text-primary">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <WalletCards size={32} />
          </div>
          <h1 className="text-3xl font-black mb-2 text-text-primary">Welcome to BudgyTrack</h1>
          <p className="text-text-muted text-sm px-4">
            Let's set up your very first tracking wallet so we can establish your baseline budget.
          </p>
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
              Wallet Name
            </label>
            <div className="relative">
              <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                required
                className="w-full bg-surface border-2 border-border rounded-2xl py-3 pl-12 pr-4 text-text-primary focus:outline-none focus:border-primary transition-colors font-medium"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g. BPI Savings, Cash Envelope"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                Account Type
              </label>
              <select
                className="w-full bg-surface border-2 border-border rounded-2xl py-3 px-4 text-text-primary focus:outline-none focus:border-primary transition-colors font-medium h-[52px] [&>option]:bg-card"
                value={walletType}
                onChange={(e) => setWalletType(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="card">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                Current Money (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full bg-surface border-2 border-border rounded-2xl py-3 px-4 text-text-primary focus:outline-none focus:border-primary transition-colors font-medium h-[52px]"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center mt-8 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Start Tracking'}
            {!loading && <ArrowRight size={20} className="ml-2" />}
          </button>
        </form>
      </div>
    </div>
  );
}
