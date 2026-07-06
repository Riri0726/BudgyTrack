import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function Budget() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBudgetVal, setNewBudgetVal] = useState('');

  const fetchBudgetDetails = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBudgetDetails();
    }
  }, [user, fetchBudgetDetails]);

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
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} className="flex-1 p-4" showsVerticalScrollIndicator={false}>
      {/* Overall Summary Card */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-4">
        <Text style={{ color: colors.text }} className="font-bold text-base mb-3">Overall Budget</Text>
        <View className="flex-row justify-between mb-2">
          <Text style={{ color: colors.textMuted }} className="text-xs">Spent: ₱{totalSpent.toFixed(2)}</Text>
          <Text style={{ color: colors.textMuted }} className="text-xs">Limit: ₱{totalBudget.toFixed(2)}</Text>
        </View>
        <View style={{ backgroundColor: colors.surface }} className="w-full rounded-full h-3 overflow-hidden mb-3">
          <View style={{ width: `${Math.min(totalPercent, 100)}%`, backgroundColor: getBarColor(totalPercent), height: '100%', borderRadius: 999 }} />
        </View>
        <View style={{ backgroundColor: totalPercent > 100 ? '#ef444420' : totalPercent > 75 ? '#f59e0b20' : colors.primary + '20' }} className="self-start px-3 py-1 rounded-full">
          <Text style={{ color: totalPercent > 100 ? '#ef4444' : totalPercent > 75 ? '#f59e0b' : colors.primary }} className="text-xs font-bold">
            {totalPercent}% spent
          </Text>
        </View>
      </View>

      {/* Category Budget Cards */}
      {categories.length === 0 ? (
        <View className="py-12 items-center">
          <Text style={{ color: colors.textMuted }} className="text-sm">No expense categories found. Add them in Settings.</Text>
        </View>
      ) : (
        categories.map(cat => {
          const percent = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0;
          const isEditing = editingId === cat.id;

          return (
            <View key={cat.id} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text style={{ color: colors.text }} className="font-bold text-base">{cat.name}</Text>
                {isEditing ? (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <TextInput
                      value={newBudgetVal}
                      onChangeText={setNewBudgetVal}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
                      className="border rounded-lg px-3 py-1.5 text-sm w-20"
                    />
                    <TouchableOpacity onPress={() => handleSave(cat.id)} style={{ backgroundColor: colors.primary }} className="px-3.5 py-2 rounded-lg">
                      <Text className="text-white text-xs font-bold">Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => { setEditingId(cat.id); setNewBudgetVal(cat.budget.toString()); }}
                    style={{ borderColor: colors.border }}
                    className="border px-3 py-1.5 rounded-lg"
                  >
                    <Text style={{ color: colors.textMuted }} className="text-xs font-semibold">Adjust</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row justify-between mb-2">
                <Text style={{ color: colors.textMuted }} className="text-xs">Spent: ₱{cat.spent.toFixed(2)}</Text>
                <Text style={{ color: colors.textMuted }} className="text-xs">Limit: ₱{parseFloat(cat.budget).toFixed(2)}</Text>
              </View>

              <View style={{ backgroundColor: colors.surface }} className="w-full rounded-full h-2 overflow-hidden mb-3">
                <View style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: getBarColor(percent), height: '100%', borderRadius: 999 }} />
              </View>

              <View style={{ backgroundColor: percent > 100 ? '#ef444420' : percent > 75 ? '#f59e0b20' : colors.primary + '20' }} className="self-start px-2 py-0.5 rounded-md">
                <Text style={{ color: percent > 100 ? '#ef4444' : percent > 75 ? '#f59e0b' : colors.primary }} className="text-[10px] font-bold">
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
