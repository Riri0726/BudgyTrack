import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Budget() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBudgetVal, setNewBudgetVal] = useState('');

  useEffect(() => {
    if (user) fetchBudgetDetails();
  }, [user]);

  const fetchBudgetDetails = async () => {
    setLoading(true);
    try {
      if (!user) return;
      const { data: cats, error: catErr } = await supabase
        .from('categories').select('*').eq('user_id', user.id).eq('type', 'expense');
      if (catErr) throw catErr;

      const { data: txs, error: txErr } = await supabase
        .from('transactions').select('*').eq('user_id', user.id).eq('type', 'expense').eq('status', 'confirmed');
      if (txErr) throw txErr;

      const mappedCats = (cats || []).map(cat => {
        const totalSpent = (txs || []).filter(t => t.category_id === cat.id).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        return { ...cat, spent: totalSpent };
      });
      setCategories(mappedCats);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string) => {
    const val = parseFloat(newBudgetVal) || 0;
    try {
      const { error } = await supabase.from('categories').update({ budget: val }).eq('id', id);
      if (error) throw error;
      setCategories(categories.map(cat => cat.id === id ? { ...cat, budget: val } : cat));
      setEditingId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const totalBudget = categories.reduce((s, c) => s + parseFloat(c.budget || 0), 0);
  const totalSpent = categories.reduce((s, c) => s + parseFloat(c.spent || 0), 0);
  const totalPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const getBarColor = (pct: number) => {
    if (pct > 100) return '#f43f5e';
    if (pct > 75) return '#f59e0b';
    return '#10b981';
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-slate-900 p-4" showsVerticalScrollIndicator={false}>
      {/* Overall Summary Card */}
      <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700/30 mb-4">
        <Text className="text-white font-semibold text-base mb-3">Overall Budget</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-slate-400 text-xs">Spent: ₱{totalSpent.toFixed(2)}</Text>
          <Text className="text-slate-400 text-xs">Limit: ₱{totalBudget.toFixed(2)}</Text>
        </View>
        <View className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
          <View style={{ width: `${Math.min(totalPercent, 100)}%`, backgroundColor: getBarColor(totalPercent), height: '100%', borderRadius: 999 }} />
        </View>
        <View className={`self-start px-3 py-1 rounded-full ${totalPercent > 100 ? 'bg-rose-500/10' : totalPercent > 75 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
          <Text className={`text-xs font-bold ${totalPercent > 100 ? 'text-rose-400' : totalPercent > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {totalPercent}% spent
          </Text>
        </View>
      </View>

      {/* Category Budget Cards */}
      {categories.length === 0 ? (
        <View className="py-12 items-center">
          <Text className="text-slate-500">No expense categories found. Add them in Settings.</Text>
        </View>
      ) : (
        categories.map(cat => {
          const percent = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
          const isEditing = editingId === cat.id;

          return (
            <View key={cat.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700/30 mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-base">{cat.name}</Text>
                {isEditing ? (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <TextInput
                      value={newBudgetVal}
                      onChangeText={setNewBudgetVal}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#475569"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm w-20"
                    />
                    <TouchableOpacity onPress={() => handleSave(cat.id)} className="bg-blue-500 px-3 py-1.5 rounded-lg">
                      <Text className="text-white text-xs font-bold">Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => { setEditingId(cat.id); setNewBudgetVal(cat.budget.toString()); }}
                    className="border border-slate-700 px-3 py-1.5 rounded-lg"
                  >
                    <Text className="text-slate-400 text-xs font-semibold">Adjust</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-400 text-xs">Spent: ₱{cat.spent.toFixed(2)}</Text>
                <Text className="text-slate-400 text-xs">Limit: ₱{parseFloat(cat.budget).toFixed(2)}</Text>
              </View>

              <View className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mb-3">
                <View style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: getBarColor(percent), height: '100%', borderRadius: 999 }} />
              </View>

              <View className={`self-start px-2 py-0.5 rounded-md ${percent > 100 ? 'bg-rose-500/10' : percent > 75 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                <Text className={`text-[10px] font-bold ${percent > 100 ? 'text-rose-400' : percent > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {percent}% Spent
                </Text>
              </View>
            </View>
          );
        })
      )}
      <View className="h-20" />
    </ScrollView>
  );
}
