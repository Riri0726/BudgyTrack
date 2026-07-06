import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Sparkles, Wallet, Landmark, Smartphone } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function Dashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

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

  // Group weekly data dynamically
  const getWeeklyChartData = () => {
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

  const dynamicChartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => {
      const hex = colors.primary;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => colors.textMuted,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {/* Dynamic Budget Alert Status */}
      <View style={{ borderColor: alertColor + '30', backgroundColor: alertColor + '10' }} className="p-4 rounded-2xl border flex-row mb-6 items-start">
        <View style={{ backgroundColor: alertColor + '15' }} className="p-2.5 rounded-xl mr-3">
          <Sparkles color={alertColor} size={22} />
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="font-bold text-base">{alertTitle}</Text>
          <Text style={{ color: colors.text }} className="text-xs mt-1 leading-4 opacity-80">{alertMessage}</Text>
        </View>
      </View>

      {/* Net Worth Dashboard Card */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="p-6 rounded-2xl border mb-6 shadow-sm">
        <Text style={{ color: colors.textMuted }} className="font-medium mb-1">Total Balance</Text>
        <Text style={{ color: colors.text }} className="text-4xl font-bold">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        
        <View style={{ borderTopColor: colors.border }} className="mt-6 flex-row justify-between border-t pt-4">
          <View>
            <Text style={{ color: colors.textMuted }} className="text-xs">Income</Text>
            <Text className="text-base font-semibold text-emerald-400 mt-0.5">₱{actualIncome.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={{ color: colors.textMuted }} className="text-xs">Expenses</Text>
            <Text className="text-base font-semibold text-rose-400 mt-0.5">₱{actualExpense.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={{ color: colors.textMuted }} className="text-xs">Net Savings</Text>
            <Text className="text-base font-semibold text-sky-400 mt-0.5">₱{actualSavings.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Chart widget */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="p-4 rounded-2xl border mb-6">
        <Text style={{ color: colors.text }} className="text-base font-bold mb-4">Weekly Expenses Trend</Text>
        <BarChart
          data={weeklyExpenseData}
          width={screenWidth - 64}
          height={200}
          yAxisLabel="₱"
          yAxisSuffix=""
          chartConfig={dynamicChartConfig}
          verticalLabelRotation={0}
          fromZero
          style={{ borderRadius: 12 }}
        />
      </View>

      {/* Accounts widget */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="p-4 rounded-2xl border mb-6">
        <Text style={{ color: colors.text }} className="text-base font-bold mb-4">Your Wallets</Text>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.textMuted }} className="text-sm py-2">No wallets found.</Text>
        ) : accounts.map((acc) => {
          const Icon = getAccountIcon(acc.type);
          return (
            <View key={acc.id} style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between py-3 border-b last:border-b-0">
              <View className="flex-row items-center">
                <View style={{ backgroundColor: colors.surface }} className="p-2.5 rounded-lg mr-3">
                  <Icon color={colors.textMuted} size={18} />
                </View>
                <View>
                  <Text style={{ color: colors.text }} className="font-semibold text-sm">{acc.name}</Text>
                  <Text style={{ color: colors.textMuted }} className="text-xs uppercase mt-0.5">{acc.type}</Text>
                </View>
              </View>
              <Text style={{ color: colors.text }} className="font-bold text-sm">₱{parseFloat(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity 
        onPress={() => router.push('/transactions')}
        style={{ backgroundColor: colors.primary }}
        className="py-4 rounded-xl items-center mb-10 shadow-lg"
      >
        <Text className="text-white font-bold text-base">Manage Transactions</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
