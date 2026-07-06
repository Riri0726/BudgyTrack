import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, X, Landmark, Wallet, Smartphone } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function Wallets() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [initialBalance, setInitialBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedWalletId, setSelectedWalletId] = useState('all');

  const walletTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank' },
    { value: 'ewallet', label: 'E-Wallet' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
  ];

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) return;
      const { data: wlts } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      setWallets(wlts || []);

      const { data: txs } = await supabase
        .from('transactions')
        .select(`id, title, amount, type, date, status, account_id, categories ( name ), accounts ( name )`)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      setTransactions(txs || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchWalletData();
  }, [user, fetchWalletData]);

  const handleAddWallet = async () => {
    if (!name || !type) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ name, type, balance: parseFloat(initialBalance || '0'), user_id: user?.id }])
        .select();
      if (error) throw error;

      if (data && data.length > 0) {
        const newWallet = data[0];
        const amount = parseFloat(initialBalance || '0');
        if (amount > 0) {
          const { data: cats } = await supabase.from('categories').select('id').eq('user_id', user?.id).eq('type', 'income').limit(1);
          if (cats && cats.length > 0) {
            await supabase.from('transactions').insert([{
              user_id: user?.id, title: 'Starting Balance', amount, type: 'income', status: 'confirmed',
              account_id: newWallet.id, category_id: cats[0].id, date: new Date().toISOString().split('T')[0],
            }]);
          }
        }
        setModalVisible(false);
        setName(''); setType('cash'); setInitialBalance('');
        fetchWalletData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWallet = (id: string) => {
    Alert.alert('Delete Wallet', 'Are you sure? Wallets with transactions must have those deleted first.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            if (error) throw error;
            setWallets(wallets.filter(w => w.id !== id));
            if (selectedWalletId === id) setSelectedWalletId('all');
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const getWalletStats = (walletId: string) => {
    const wTxs = transactions.filter(t => t.account_id === walletId);
    const spent = wTxs.filter(t => t.type === 'expense' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount), 0);
    const income = wTxs.filter(t => t.type === 'income' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount), 0);
    return { spent, income, balance: income - spent };
  };

  const overallSpent = transactions.filter(t => t.type === 'expense' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount), 0);
  const overallIncome = transactions.filter(t => t.type === 'income' && t.status === 'confirmed').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalBalance = overallIncome - overallSpent;
  const filteredTxs = transactions.filter(tx => selectedWalletId === 'all' || tx.account_id === selectedWalletId);

  const getIcon = (t: string) => {
    if (t === 'bank') return <Landmark color={colors.textMuted} size={16} />;
    if (t === 'ewallet') return <Smartphone color={colors.textMuted} size={16} />;
    return <Wallet color={colors.textMuted} size={16} />;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View className="flex-row mb-4" style={{ gap: 8 }}>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 p-4 rounded-xl border">
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold">Total Balance</Text>
            <Text style={{ color: colors.text }} className="font-bold text-lg mt-1">₱{totalBalance.toFixed(2)}</Text>
          </View>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 p-4 rounded-xl border">
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold">Inflow</Text>
            <Text className="text-emerald-400 font-bold text-lg mt-1">₱{overallIncome.toFixed(2)}</Text>
          </View>
        </View>

        {/* Wallet selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <TouchableOpacity
            onPress={() => setSelectedWalletId('all')}
            style={{
              backgroundColor: selectedWalletId === 'all' ? colors.primary + '15' : colors.card,
              borderColor: selectedWalletId === 'all' ? colors.primary : colors.border
            }}
            className="mr-3 px-4 py-3 rounded-xl border min-w-[130px]"
          >
            <Text style={{ color: selectedWalletId === 'all' ? colors.primary : colors.text }} className="font-bold text-sm">All Wallets</Text>
            <Text style={{ color: colors.text }} className="font-bold text-base mt-1">₱{totalBalance.toFixed(2)}</Text>
          </TouchableOpacity>
          {wallets.map(wlt => {
            const stats = getWalletStats(wlt.id);
            const isSelected = selectedWalletId === wlt.id;
            return (
              <TouchableOpacity
                key={wlt.id}
                onPress={() => setSelectedWalletId(wlt.id)}
                onLongPress={() => handleDeleteWallet(wlt.id)}
                style={{
                  backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border
                }}
                className="mr-3 px-4 py-3 rounded-xl border min-w-[130px]"
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text style={{ color: isSelected ? colors.primary : colors.text }} className="font-bold text-sm" numberOfLines={1}>{wlt.name}</Text>
                  {getIcon(wlt.type)}
                </View>
                <Text style={{ color: colors.text }} className="font-bold text-base">₱{stats.balance.toFixed(2)}</Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-emerald-400 text-[10px]">+₱{stats.income.toFixed(0)}</Text>
                  <Text className="text-rose-400 text-[10px]">-₱{stats.spent.toFixed(0)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Transaction Ledger */}
        <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-xl border p-4 mb-20">
          <Text style={{ color: colors.text }} className="font-semibold text-base mb-3">
            Ledger: {selectedWalletId === 'all' ? 'All Wallets' : wallets.find(w => w.id === selectedWalletId)?.name || 'Wallet'}
          </Text>
          {filteredTxs.length === 0 ? (
            <Text style={{ color: colors.textMuted }} className="text-center py-6">No transactions found.</Text>
          ) : (
            filteredTxs.map(tx => (
              <View key={tx.id} style={{ borderBottomColor: colors.border + '50' }} className="flex-row items-center justify-between py-3 border-b">
                <View className="flex-row items-center flex-1 pr-4">
                  <View style={{ backgroundColor: tx.type === 'income' ? '#10b98115' : colors.surface }} className="p-2.5 rounded-lg mr-3">
                    {tx.type === 'income' ? <ArrowUpRight color="#10b981" size={14} /> : <ArrowDownRight color={colors.textMuted} size={14} />}
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="font-semibold text-sm" numberOfLines={1}>{tx.title}</Text>
                    <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">{tx.categories?.name} • {tx.date}</Text>
                  </View>
                </View>
                <Text className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}₱{parseFloat(tx.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{ backgroundColor: colors.primary }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      {/* Add Wallet Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-t-3xl p-6 border-t">
            <View className="flex-row justify-between items-center mb-6">
              <Text style={{ color: colors.text }} className="font-bold text-lg">Create Wallet</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color={colors.textMuted} size={22} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Wallet Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Travel Fund" placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
                className="p-3 rounded-xl mb-4 border" />

              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {walletTypes.map(wt => (
                  <TouchableOpacity key={wt.value} onPress={() => setType(wt.value)}
                    style={{
                      backgroundColor: type === wt.value ? colors.primary + '20' : colors.surface,
                      borderColor: type === wt.value ? colors.primary : colors.border
                    }}
                    className="px-4 py-2.5 rounded-xl border mr-2">
                    <Text style={{ color: type === wt.value ? colors.primary : colors.textMuted }} className="font-bold text-sm">{wt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Starting Balance (₱)</Text>
              <TextInput value={initialBalance} onChangeText={setInitialBalance} placeholder="0.00" placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
                keyboardType="numeric" className="p-3 rounded-xl mb-6 border" />

              <TouchableOpacity onPress={handleAddWallet} disabled={isSubmitting}
                style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
                className="p-4 rounded-xl items-center mb-8">
                <Text className="text-white font-bold text-base">{isSubmitting ? 'Saving...' : 'Save Wallet'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
