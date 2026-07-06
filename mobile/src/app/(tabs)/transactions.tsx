import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, X, RefreshCw, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function Transactions() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<'confirmed' | 'planned'>('confirmed');
  const [isRecurring, setIsRecurring] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) return;
      // Fetch Accounts
      const { data: accs } = await supabase.from('accounts').select('*').eq('user_id', user.id);
      if (accs) {
        setAccounts(accs);
        if (accs.length > 0) setAccountId(accs[0].id);
      }

      // Fetch Categories
      const { data: cats } = await supabase.from('categories').select('*').eq('user_id', user.id);
      if (cats) {
        setCategories(cats);
        const expCats = cats.filter(c => c.type === 'expense');
        if (expCats.length > 0) setCategoryId(expCats[0].id);
      }

      // Fetch Transactions
      const { data: txs } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id, category_id,
          categories ( name ),
          accounts ( name )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (txs) setTransactions(txs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [user, fetchData]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const filteredCats = categories.filter(c => c.type === newType);
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  const handleAdd = async () => {
    if (!title || !amount || !accountId || !categoryId) return;
    setIsSubmitting(true);

    try {
      const newTx = {
        title,
        amount: parseFloat(amount),
        type,
        status,
        is_recurring: isRecurring,
        date: new Date().toISOString(),
        account_id: accountId,
        category_id: categoryId,
        user_id: user?.id
      };

      const { data, error } = await supabase.from('transactions').insert([newTx]).select(`
        id, title, amount, type, date, status, is_recurring, account_id, category_id,
        categories ( name ),
        accounts ( name )
      `);

      if (error) throw error;

      if (data) {
        setTransactions([data[0], ...transactions]);

        // If confirmed, update account balance
        if (status === 'confirmed') {
          const acc = accounts.find(a => a.id === accountId);
          if (acc) {
            const currentBalance = parseFloat(acc.balance);
            const amt = parseFloat(amount);
            const newBalance = type === 'income' ? currentBalance + amt : currentBalance - amt;

            await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
            setAccounts(accounts.map(a => a.id === accountId ? { ...a, balance: newBalance } : a));
          }
        }
      }

      setModalVisible(false);

      // reset form
      setTitle('');
      setAmount('');
      setStatus('confirmed');
      setIsRecurring(false);
    } catch (err: any) {
      console.error('Error adding transaction:', err.message);
      alert('Failed to add transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStatus = async (tx: any) => {
    try {
      const { error } = await supabase.from('transactions').update({ status: 'confirmed' }).eq('id', tx.id);
      if (error) throw error;

      // Update local state
      setTransactions(transactions.map(t =>
        t.id === tx.id ? { ...t, status: 'confirmed' } : t
      ));

      // Update account balance
      const acc = accounts.find(a => a.id === tx.account_id);
      if (acc) {
        const currentBalance = parseFloat(acc.balance);
        const amt = parseFloat(tx.amount);
        const newBalance = tx.type === 'income' ? currentBalance + amt : currentBalance - amt;

        await supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.account_id);
        setAccounts(accounts.map(a => a.id === tx.account_id ? { ...a, balance: newBalance } : a));
      }
    } catch (err: any) {
      console.error('Error confirming transaction:', err.message);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="p-4 rounded-xl mb-3 border shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 pr-4">
          <View style={{ backgroundColor: item.type === 'income' ? '#10b98115' : colors.surface }} className="p-2.5 rounded-full mr-3">
            {item.type === 'income' ? <ArrowUpRight color="#10b981" size={18} /> : <ArrowDownRight color={colors.textMuted} size={18} />}
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="font-bold text-base" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Text style={{ color: colors.textMuted }} className="text-xs">{item.categories?.name} • {item.accounts?.name}</Text>
              {item.is_recurring && (
                <View style={{ backgroundColor: colors.surface }} className="flex-row items-center ml-2 px-1.5 py-0.5 rounded-md">
                  <RefreshCw color={colors.textMuted} size={8} className="mr-1" />
                  <Text style={{ color: colors.textMuted }} className="text-[8px] font-bold">SUB</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-base ${item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {item.type === 'income' ? '+' : '-'}₱{parseFloat(item.amount).toFixed(2)}
          </Text>
          <Text style={{ color: colors.textMuted }} className="text-[10px] mt-1">{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={{ borderTopColor: colors.border + '50' }} className="flex-row items-center justify-between border-t pt-2 mt-1">
        <View className="flex-row items-center">
          <Text style={{
            backgroundColor: item.status === 'confirmed' ? '#10b98115' : '#f59e0b15',
            color: item.status === 'confirmed' ? '#10b981' : '#f59e0b'
          }} className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
            {item.status}
          </Text>
        </View>

        {item.status === 'planned' && (
          <TouchableOpacity
            onPress={() => handleConfirmStatus(item)}
            style={{
              backgroundColor: colors.primary + '15',
              borderColor: colors.primary + '30',
            }}
            className="px-3 py-1.5 rounded-lg border flex-row items-center"
          >
            <Check color={colors.primary} size={10} className="mr-1" />
            <Text style={{ color: colors.primary }} className="text-xs font-bold">
              {item.type === 'expense' ? 'Mark Paid' : 'Mark Recv'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1 p-4">
      {transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text style={{ color: colors.textMuted }}>No transactions found.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{ backgroundColor: colors.primary }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus color="white" size={24} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-t-3xl p-6 min-h-[70%] max-h-[90%] border-t">
            <View className="flex-row justify-between items-center mb-6">
              <Text style={{ color: colors.text }} className="font-bold text-lg">Add Transaction</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Type Switcher */}
              <View style={{ backgroundColor: colors.surface }} className="flex-row mb-4 p-1 rounded-xl">
                <TouchableOpacity
                  onPress={() => handleTypeChange('expense')}
                  style={{
                    backgroundColor: type === 'expense' ? colors.card : 'transparent',
                    borderColor: type === 'expense' ? colors.border : 'transparent',
                    borderWidth: 1,
                  }}
                  className="flex-1 py-3 rounded-lg items-center"
                >
                  <Text style={{ color: type === 'expense' ? '#ef4444' : colors.textMuted }} className="font-bold">Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTypeChange('income')}
                  style={{
                    backgroundColor: type === 'income' ? colors.card : 'transparent',
                    borderColor: type === 'income' ? colors.border : 'transparent',
                    borderWidth: 1,
                  }}
                  className="flex-1 py-3 rounded-lg items-center"
                >
                  <Text style={{ color: type === 'income' ? '#10b981' : colors.textMuted }} className="font-bold">Income</Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Rent / Salary"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
                className="p-3 rounded-xl mb-4 border"
              />

              {/* Amount Input */}
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Amount (₱)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
                className="p-3 rounded-xl mb-4 border"
              />

              {/* Category Picker */}
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row flex-wrap w-full">
                  {categories.filter(cat => cat.type === type).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={{
                        backgroundColor: categoryId === cat.id ? colors.primary + '20' : colors.surface,
                        borderColor: categoryId === cat.id ? colors.primary : colors.border
                      }}
                      className="px-4 py-2.5 rounded-xl border mr-2 mb-2"
                    >
                      <Text style={{ color: categoryId === cat.id ? colors.primary : colors.textMuted }} className="font-bold text-sm">
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Account Picker */}
              <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row flex-wrap w-full">
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setAccountId(acc.id)}
                      style={{
                        backgroundColor: accountId === acc.id ? colors.primary + '20' : colors.surface,
                        borderColor: accountId === acc.id ? colors.primary : colors.border
                      }}
                      className="px-4 py-2.5 rounded-xl border mr-2 mb-2"
                    >
                      <Text style={{ color: accountId === acc.id ? colors.primary : colors.textMuted }} className="font-bold text-sm">
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Status and Subscription Options */}
              <View style={{ borderTopColor: colors.border }} className="border-t pt-4 mt-2 mb-6">
                <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Status</Text>
                <View style={{ backgroundColor: colors.surface, gap: 4 }} className="flex-row mb-4 p-1 rounded-xl">
                  <TouchableOpacity
                    onPress={() => setStatus('confirmed')}
                    style={{
                      backgroundColor: status === 'confirmed' ? colors.card : 'transparent',
                      borderColor: status === 'confirmed' ? colors.border : 'transparent',
                      borderWidth: 1,
                    }}
                    className="flex-1 py-2.5 rounded-lg items-center"
                  >
                    <Text style={{ color: colors.text }} className="font-bold text-xs">Confirmed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStatus('planned')}
                    style={{
                      backgroundColor: status === 'planned' ? colors.card : 'transparent',
                      borderColor: status === 'planned' ? colors.border : 'transparent',
                      borderWidth: 1,
                    }}
                    className="flex-1 py-2.5 rounded-lg items-center"
                  >
                    <Text style={{ color: '#f59e0b' }} className="font-bold text-xs">Planned</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setIsRecurring(!isRecurring)}
                  style={{
                    backgroundColor: isRecurring ? colors.primary + '10' : colors.surface,
                    borderColor: isRecurring ? colors.primary : colors.border
                  }}
                  className="py-3.5 rounded-xl border items-center"
                >
                  <Text style={{ color: isRecurring ? colors.primary : colors.textMuted }} className="font-bold">
                    {isRecurring ? 'Recurring (Subscription Active)' : 'Mark as Recurring?'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleAdd}
                disabled={isSubmitting}
                style={{ backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }}
                className="p-4 rounded-xl items-center mb-8 shadow-lg"
              >
                <Text className="text-white font-bold text-base">{isSubmitting ? 'Saving...' : 'Save Transaction'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
