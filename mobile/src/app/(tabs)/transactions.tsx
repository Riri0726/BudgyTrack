import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, X, RefreshCw, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Transactions() {
  const { user } = useAuth();
  
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

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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
  };

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
    <View className="bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-slate-700/30">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 pr-4">
          <View className={`p-2.5 rounded-full mr-3 ${item.type === 'income' ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
            {item.type === 'income' ? <ArrowUpRight color="#10b981" size={18} /> : <ArrowDownRight color="#94a3b8" size={18} />}
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-slate-400 text-xs">{item.categories?.name} • {item.accounts?.name}</Text>
              {item.is_recurring && (
                <View className="flex-row items-center ml-2 bg-slate-700/50 px-1.5 py-0.5 rounded-md">
                  <RefreshCw color="#94a3b8" size={8} className="mr-1" />
                  <Text className="text-slate-400 text-[8px] font-bold">SUB</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-base ${item.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
            {item.type === 'income' ? '+' : '-'}₱{parseFloat(item.amount).toFixed(2)}
          </Text>
          <Text className="text-slate-500 text-[10px] mt-1">{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between border-t border-slate-700/40 pt-2 mt-1">
        <View className="flex-row items-center">
          <Text className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
            item.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            {item.status}
          </Text>
        </View>
        
        {item.status === 'planned' && (
          <TouchableOpacity 
            onPress={() => handleConfirmStatus(item)}
            className="bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30 flex-row items-center"
          >
            <Check color="#10b981" size={10} className="mr-1" />
            <Text className="text-emerald-400 text-xs font-semibold">
              {item.type === 'expense' ? 'Mark Paid' : 'Mark Recv'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900 p-4">
      {transactions.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-500">No transactions found.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
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
          <View className="bg-slate-800 rounded-t-3xl p-6 min-h-[70%] max-h-[90%] border-t border-slate-700">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-lg">Add Transaction</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#94a3b8" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Type Switcher */}
              <View className="flex-row mb-4 bg-slate-900 p-1 rounded-xl">
                <TouchableOpacity 
                  onPress={() => handleTypeChange('expense')}
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'expense' ? 'bg-rose-500/20 border border-rose-500/30' : ''}`}
                >
                  <Text className={`font-semibold ${type === 'expense' ? 'text-rose-400' : 'text-slate-400'}`}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleTypeChange('income')}
                  className={`flex-1 py-3 rounded-lg items-center ${type === 'income' ? 'bg-emerald-500/20 border border-emerald-500/30' : ''}`}
                >
                  <Text className={`font-semibold ${type === 'income' ? 'text-emerald-400' : 'text-slate-400'}`}>Income</Text>
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Rent / Salary"
                placeholderTextColor="#475569"
                className="bg-slate-900 p-3 rounded-xl text-white mb-4 border border-slate-700/50 focus:border-blue-500"
              />

              {/* Amount Input */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Amount (₱)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#475569"
                className="bg-slate-900 p-3 rounded-xl text-white mb-4 border border-slate-700/50 focus:border-blue-500"
              />

              {/* Category Picker */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row flex-wrap w-full">
                  {categories.filter(cat => cat.type === type).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-xl border mr-2 mb-2 ${
                        categoryId === cat.id
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Text className={categoryId === cat.id ? 'text-blue-400 font-medium' : 'text-slate-400'}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Account Picker */}
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row flex-wrap w-full">
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setAccountId(acc.id)}
                      className={`px-4 py-2 rounded-xl border mr-2 mb-2 ${
                        accountId === acc.id
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Text className={accountId === acc.id ? 'text-blue-400 font-medium' : 'text-slate-400'}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Status and Subscription Options */}
              <View className="border-t border-slate-700/50 pt-4 mt-2 mb-6">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Status</Text>
                <View className="flex-row mb-4 bg-slate-900 p-1 rounded-xl">
                  <TouchableOpacity 
                    onPress={() => setStatus('confirmed')}
                    className={`flex-1 py-2.5 rounded-lg items-center ${status === 'confirmed' ? 'bg-slate-700 border border-slate-650' : ''}`}
                  >
                    <Text className="text-white font-medium text-xs">Confirmed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setStatus('planned')}
                    className={`flex-1 py-2.5 rounded-lg items-center ${status === 'planned' ? 'bg-slate-700 border border-slate-650' : ''}`}
                  >
                    <Text className="text-amber-400 font-medium text-xs">Planned</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={() => setIsRecurring(!isRecurring)}
                  className={`py-3 rounded-xl border items-center ${isRecurring ? 'bg-blue-500/10 border-blue-500' : 'border-slate-700'}`}
                >
                  <Text className={isRecurring ? 'text-blue-400 font-bold' : 'text-slate-400'}>
                    {isRecurring ? 'Recurring (Subscription Active)' : 'Mark as Recurring?'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleAdd}
                disabled={isSubmitting}
                className={`p-4 rounded-xl items-center mb-8 shadow-lg ${isSubmitting ? 'bg-blue-500/50' : 'bg-blue-500 shadow-blue-500/30'}`}
              >
                <Text className="text-white font-semibold text-lg">{isSubmitting ? 'Saving...' : 'Save Transaction'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
