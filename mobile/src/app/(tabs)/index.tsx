import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Sparkles, Wallet, ArrowUpRight, ArrowDownRight, Landmark, Smartphone } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (!user) return;
      // 1. Fetch Accounts
      const { data: accs, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);
      if (accErr) throw accErr;
      setAccounts(accs || []);

      // 2. Fetch Categories
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      if (catErr) throw catErr;
      setCategories(cats || []);

      // 3. Fetch Transactions
      const { data: txs, error: txErr } = await supabase
        .from('transactions')
        .select(`
          id, title, amount, type, date, status, is_recurring, account_id, category_id,
          categories ( name )
        `)
        .eq('user_id', user.id);
      if (txErr) throw txErr;
      setTransactions(txs || []);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const budgetLimit = categories.reduce((sum, cat) => sum + parseFloat(cat.budget || 0), 0) || 5000.00;

  // Filter current month transactions
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTxs = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const actualIncome = monthlyTxs
    .filter(t => t.type === 'income' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const actualExpense = monthlyTxs
    .filter(t => t.type === 'expense' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const expectedExpense = monthlyTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const actualSavings = actualIncome - actualExpense;

  const actualPercentage = Math.round((actualExpense / budgetLimit) * 100) || 0;
  const expectedPercentage = Math.round((expectedExpense / budgetLimit) * 100) || 0;
  
  let alertBg = 'bg-emerald-500/10 border-emerald-500/20';
  let alertTitle = 'Looking Good!';
  let alertMessage = `You've spent ${actualPercentage}% of your monthly limit (₱${actualExpense.toFixed(2)} actual / ₱${expectedExpense.toFixed(2)} expected). You're under control!`;
  let alertColor = '#10b981';

  if (expectedPercentage >= 100) {
    alertBg = 'bg-rose-500/10 border-rose-500/20';
    alertTitle = 'Ooh! Planning Alert!';
    alertMessage = `Your expected monthly expenses (₱${expectedExpense.toFixed(2)}) will exceed your budget by ₱${(expectedExpense - budgetLimit).toFixed(2)} (${expectedPercentage}% expected). Plan your upcoming costs carefully!`;
    alertColor = '#ef4444';
  } else if (expectedPercentage >= 75) {
    alertBg = 'bg-amber-500/10 border-amber-500/20';
    alertTitle = 'Almost There (Expected)!';
    alertMessage = `Your expected monthly expenses are at ${expectedPercentage}% of your budget limit. Current actual spending is ${actualPercentage}%.`;
    alertColor = '#f59e0b';
  }

  // Get Top Expenses
  const topExpenses = [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Group weekly data dynamically
  const getWeeklyChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [0, 0, 0, 0, 0, 0, 0];
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    transactions.forEach(t => {
      if (t.type === 'expense' && t.status === 'confirmed') {
        const tDate = new Date(t.date);
        if (tDate >= oneWeekAgo && tDate <= now) {
          const dayIndex = (tDate.getDay() + 6) % 7; // Map so Monday is 0
          data[dayIndex] += parseFloat(t.amount);
        }
      }
    });
    return data;
  };

  const weeklyExpenseData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: getWeeklyChartData() }]
  };

  const getAccountIcon = (type: string) => {
    if (type === 'bank') return Landmark;
    if (type === 'ewallet') return Smartphone;
    return Wallet;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      {/* Dynamic Budget Alert Status */}
      <View className={`p-4 rounded-2xl border ${alertBg} flex-row mb-6 items-start space-x-3`}>
        <View className="p-2 bg-white/5 rounded-xl">
          <Sparkles color={alertColor} size={22} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{alertTitle}</Text>
          <Text className="text-slate-300 text-xs mt-1 leading-4">{alertMessage}</Text>
        </View>
      </View>

      {/* Net Worth Dashboard Card */}
      <View className="bg-slate-800 p-6 rounded-2xl mb-6 shadow-lg shadow-black/20">
        <Text className="text-slate-400 font-medium mb-1">Total Balance</Text>
        <Text className="text-4xl font-bold text-white">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        
        <View className="mt-6 flex-row justify-between border-t border-slate-700/50 pt-4">
          <View>
            <Text className="text-slate-400 text-xs">Income</Text>
            <Text className="text-base font-semibold text-emerald-400 mt-0.5">₱{actualIncome.toFixed(2)}</Text>
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Expenses</Text>
            <Text className="text-base font-semibold text-rose-400 mt-0.5">₱{actualExpense.toFixed(2)}</Text>
          </View>
          <View>
            <Text className="text-slate-400 text-xs">Net Savings</Text>
            <Text className="text-base font-semibold text-sky-400 mt-0.5">₱{actualSavings.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Chart widget */}
      <View className="bg-slate-800 p-4 rounded-2xl mb-6">
        <Text className="text-base font-semibold text-white mb-4">Weekly Expenses Trend</Text>
        <BarChart
          data={weeklyExpenseData}
          width={screenWidth - 64}
          height={200}
          yAxisLabel="₱"
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          fromZero
          style={{ borderRadius: 16 }}
        />
      </View>

      {/* Accounts widget */}
      <View className="bg-slate-800 p-4 rounded-2xl mb-6">
        <Text className="text-base font-semibold text-white mb-4">Your Wallets</Text>
        {accounts.length === 0 ? (
          <Text className="text-slate-500 text-sm py-2">No wallets found.</Text>
        ) : accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          return (
            <View key={acc.id} className="flex-row items-center justify-between py-3 border-b border-slate-700/50 last:border-b-0">
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-slate-700/50 rounded-lg">
                  <Icon color="#94a3b8" size={18} />
                </View>
                <View>
                  <Text className="text-white font-semibold text-sm">{acc.name}</Text>
                  <Text className="text-slate-400 text-xs uppercase">{acc.type}</Text>
                </View>
              </View>
              <Text className="text-white font-bold text-sm">₱{parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity 
        onPress={() => router.push('/transactions')}
        className="bg-blue-500 py-4 rounded-xl items-center mb-10 shadow-lg shadow-blue-500/30"
      >
        <Text className="text-white font-semibold text-lg">Manage Transactions</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
