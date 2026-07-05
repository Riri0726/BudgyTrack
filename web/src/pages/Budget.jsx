import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Budget() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newBudgetVal, setNewBudgetVal] = useState('');

  useEffect(() => {
    if (user) {
      fetchBudgetDetails();
    }
  }, [user]);

  const fetchBudgetDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Expense Categories
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense');
      if (catErr) throw catErr;

      // 2. Fetch Confirmed Expense Transactions to sum spent amount
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('status', 'confirmed');
      if (txErr) throw txErr;

      // Merge transaction totals into categories array
      const mappedCats = (cats || []).map(cat => {
        const totalSpent = (txs || [])
          .filter(t => t.category_id === cat.id)
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        return {
          ...cat,
          spent: totalSpent
        };
      });

      setCategories(mappedCats);
    } catch (err) {
      console.error('Error fetching budget summary:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setNewBudgetVal(cat.budget.toString());
  };

  const handleSave = async (id) => {
    const val = parseFloat(newBudgetVal) || 0;
    try {
      const { error } = await supabase
        .from('categories')
        .update({ budget: val })
        .eq('id', id);

      if (error) throw error;
      
      setCategories(categories.map(cat => 
        cat.id === id ? { ...cat, budget: val } : cat
      ));
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const totalBudget = categories.reduce((sum, cat) => sum + parseFloat(cat.budget || 0), 0);
  const totalSpent = categories.reduce((sum, cat) => sum + parseFloat(cat.spent || 0), 0);
  const totalPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Category Budgets</h1>
        <p className="text-text-muted mt-1">Set monthly limits for specific spending areas.</p>
      </header>

      {loading ? (
        <div className="p-12 text-center text-text-muted">Loading budgets details...</div>
      ) : (
        <>
          {/* Main Budget Card */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Overall Budget Summary</h3>
            <div className="flex justify-between text-sm text-text-muted mb-2">
              <span>Total Spent: ₱{totalSpent.toFixed(2)}</span>
              <span>Budget Limit: ₱{totalBudget.toFixed(2)}</span>
            </div>
            <div className="w-full bg-surface rounded-full h-3 mb-4 overflow-hidden border border-border">
              <div 
                className={`h-full rounded-full transition-all duration-550 ${
                  totalPercent > 100 ? 'bg-rose-500' : totalPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(totalPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface border border-border text-text-primary">
              {totalPercent}% of overall budget spent
            </span>
          </div>

          {/* Categories Budget Adjuster */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => {
              const percent = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
              const isEditing = editingId === cat.id;

              return (
                <div key={cat.id} className="glass rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-lg text-text-primary">{cat.name}</h4>
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            className="bg-surface border border-border rounded-lg px-3 py-1.5 w-24 text-text-primary text-sm focus:outline-none focus:border-primary/50"
                            value={newBudgetVal}
                            onChange={(e) => setNewBudgetVal(e.target.value)}
                          />
                          <button 
                            onClick={() => handleSave(cat.id)}
                            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleEdit(cat)}
                          className="text-text-muted hover:text-text-primary text-xs font-semibold border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors"
                        >
                          Adjust Limit
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between text-xs text-text-muted mb-2">
                      <span>Spent: ₱{cat.spent.toFixed(2)}</span>
                      <span>Limit: ₱{parseFloat(cat.budget).toFixed(2)}</span>
                    </div>
                    
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-550 ${
                          percent > 100 ? 'bg-rose-500' : percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <span className={`text-xs font-semibold self-start px-2 py-0.5 rounded-md ${
                    percent > 100 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/10' : percent > 75 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                  }`}>
                    {percent}% Spent
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
