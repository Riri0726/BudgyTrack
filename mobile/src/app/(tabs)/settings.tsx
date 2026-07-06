import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { User, MapPin, Plus, Trash2, Tag } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startLocationTracking } from '../../lib/locationTask';

export default function Settings() {
  const { user, signOut } = useAuth();

  // Profile
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Location / Radius
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCategories();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFname(data.first_name || '');
        setLname(data.last_name || '');
        if (data.home_lat && data.home_lng) {
          setHomeLat(data.home_lat);
          setHomeLng(data.home_lng);
          setRadiusMeters(data.home_radius_meters || 1000);
          setRadiusEnabled(true);
        }
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user?.id, first_name: fname, last_name: lname });
      if (error) throw error;
      Alert.alert('Success', 'Profile updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    try {
      const { data, error } = await supabase.from('categories').insert([{ name: newCatName, type: newCatType, user_id: user?.id }]).select();
      if (error) throw error;
      if (data) { setCategories([...categories, data[0]]); setNewCatName(''); }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert('Delete Category', `Delete "${name}"? Categories with transactions cannot be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            setCategories(categories.filter(c => c.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  // ========== RADIUS / GEOFENCE ==========
  const handlePinHomeLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location access to pin your home.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // Save to Supabase
      const { error } = await supabase.from('profiles').update({
        home_lat: lat, home_lng: lng, home_radius_meters: radiusMeters,
      }).eq('id', user?.id);
      if (error) throw error;

      // Cache locally for background task
      await AsyncStorage.setItem('home_lat', lat.toString());
      await AsyncStorage.setItem('home_lng', lng.toString());
      await AsyncStorage.setItem('home_radius', radiusMeters.toString());

      setHomeLat(lat);
      setHomeLng(lng);
      setRadiusEnabled(true);

      // Request background permission and start tracking
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await startLocationTracking(lat, lng);
        Alert.alert('Home Pinned!', `Your home location has been set. You'll be notified when you're ${radiusMeters}m away for 10+ minutes.`);
      } else {
        Alert.alert('Partial Setup', 'Home pinned, but background location was denied. Notifications won\'t work until you enable it in device settings.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUpdateRadius = async (newRadius: number) => {
    setRadiusMeters(newRadius);
    try {
      await supabase.from('profiles').update({ home_radius_meters: newRadius }).eq('id', user?.id);
      await AsyncStorage.setItem('home_radius', newRadius.toString());
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleToggleRadius = async (enabled: boolean) => {
    setRadiusEnabled(enabled);
    if (!enabled) {
      // Stop tracking
      try {
        const isTracking = await Location.hasStartedLocationUpdatesAsync('background-location-task');
        if (isTracking) {
          await Location.stopLocationUpdatesAsync('background-location-task');
        }
      } catch { /* task not registered yet, ignore */ }
    } else if (homeLat && homeLng) {
      // Re-start tracking
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        await startLocationTracking(homeLat, homeLng);
      } else {
        Alert.alert('Permission Required', 'Background location permission is needed for the radius notificator.');
        setRadiusEnabled(false);
      }
    } else {
      // No home location set yet, prompt to pin
      Alert.alert('No Home Location', 'Please pin your home location first.');
      setRadiusEnabled(false);
    }
  };

  const radiusOptions = [500, 1000, 1500, 2000, 3000, 5000];

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView className="flex-1 bg-slate-900 p-4" showsVerticalScrollIndicator={false}>

      {/* ===== PROFILE SECTION ===== */}
      <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700/30 mb-4">
        <View className="flex-row items-center mb-4">
          <View className="p-2.5 bg-blue-500/10 rounded-xl mr-3"><User color="#3b82f6" size={20} /></View>
          <Text className="text-white font-bold text-base">Profile</Text>
        </View>

        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">First Name</Text>
        <TextInput value={fname} onChangeText={setFname} placeholder="Jane" placeholderTextColor="#475569"
          className="bg-slate-900 p-3 rounded-xl text-white mb-3 border border-slate-700/50" />

        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Last Name</Text>
        <TextInput value={lname} onChangeText={setLname} placeholder="Doe" placeholderTextColor="#475569"
          className="bg-slate-900 p-3 rounded-xl text-white mb-4 border border-slate-700/50" />

        <TouchableOpacity onPress={handleUpdateProfile} disabled={profileLoading}
          className={`p-3 rounded-xl items-center ${profileLoading ? 'bg-blue-500/50' : 'bg-blue-500'}`}>
          <Text className="text-white font-semibold">{profileLoading ? 'Saving...' : 'Update Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* ===== RADIUS NOTIFICATOR SECTION ===== */}
      <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700/30 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="p-2.5 bg-emerald-500/10 rounded-xl mr-3"><MapPin color="#10b981" size={20} /></View>
            <View>
              <Text className="text-white font-bold text-base">Radius Notificator</Text>
              <Text className="text-slate-400 text-xs">Get reminded to log expenses away from home</Text>
            </View>
          </View>
          <Switch
            value={radiusEnabled}
            onValueChange={handleToggleRadius}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Home location status */}
        <View className="bg-slate-900 rounded-xl p-4 border border-slate-700/30 mb-4">
          {homeLat && homeLng ? (
            <View>
              <Text className="text-emerald-400 text-xs font-bold uppercase mb-1">📍 Home Pinned</Text>
              <Text className="text-slate-400 text-xs">{homeLat.toFixed(6)}, {homeLng.toFixed(6)}</Text>
            </View>
          ) : (
            <Text className="text-amber-400 text-xs font-semibold">No home location set. Pin your current location below.</Text>
          )}
        </View>

        {/* Pin / Re-pin home */}
        <TouchableOpacity onPress={handlePinHomeLocation} disabled={locationLoading}
          className={`p-3 rounded-xl items-center mb-4 border ${locationLoading ? 'bg-slate-700 border-slate-600' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <Text className={`font-semibold text-sm ${locationLoading ? 'text-slate-400' : 'text-emerald-400'}`}>
            {locationLoading ? 'Getting GPS...' : homeLat ? '📍 Re-pin Home Location' : '📍 Pin Current Location as Home'}
          </Text>
        </TouchableOpacity>

        {/* Radius selector */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Notification Radius</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {radiusOptions.map(r => (
            <TouchableOpacity key={r} onPress={() => handleUpdateRadius(r)}
              className={`px-4 py-2 rounded-xl border mr-2 ${radiusMeters === r ? 'bg-blue-500/20 border-blue-500' : 'border-slate-700 bg-slate-900'}`}>
              <Text className={`font-medium text-sm ${radiusMeters === r ? 'text-blue-400' : 'text-slate-400'}`}>
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text className="text-slate-500 text-[10px] mt-1">
          You'll be notified after being {radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`} from home for 10+ minutes.
        </Text>
      </View>

      {/* ===== CATEGORIES SECTION ===== */}
      <View className="bg-slate-800 rounded-2xl p-5 border border-slate-700/30 mb-4">
        <View className="flex-row items-center mb-4">
          <View className="p-2.5 bg-amber-500/10 rounded-xl mr-3"><Tag color="#f59e0b" size={20} /></View>
          <Text className="text-white font-bold text-base">Categories</Text>
        </View>

        {/* Add Category */}
        <View className="flex-row mb-4" style={{ gap: 8 }}>
          <TextInput value={newCatName} onChangeText={setNewCatName} placeholder="New category..." placeholderTextColor="#475569"
            className="flex-1 bg-slate-900 p-3 rounded-xl text-white border border-slate-700/50" />
          <TouchableOpacity onPress={handleAddCategory} className="bg-blue-500 p-3 rounded-xl items-center justify-center">
            <Plus color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Type selector for new category */}
        <View className="flex-row mb-4 bg-slate-900 p-1 rounded-xl">
          <TouchableOpacity onPress={() => setNewCatType('expense')}
            className={`flex-1 py-2 rounded-lg items-center ${newCatType === 'expense' ? 'bg-rose-500/20 border border-rose-500/30' : ''}`}>
            <Text className={`font-semibold text-xs ${newCatType === 'expense' ? 'text-rose-400' : 'text-slate-400'}`}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNewCatType('income')}
            className={`flex-1 py-2 rounded-lg items-center ${newCatType === 'income' ? 'bg-emerald-500/20 border border-emerald-500/30' : ''}`}>
            <Text className={`font-semibold text-xs ${newCatType === 'income' ? 'text-emerald-400' : 'text-slate-400'}`}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Category list */}
        {categories.map(cat => (
          <View key={cat.id} className="flex-row items-center justify-between py-3 border-b border-slate-700/30">
            <View className="flex-row items-center flex-1">
              <View className={`w-2 h-2 rounded-full mr-3 ${cat.type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <View>
                <Text className="text-white font-medium text-sm">{cat.name}</Text>
                <Text className="text-slate-500 text-[10px] uppercase font-bold">{cat.type}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} className="p-2">
              <Trash2 color="#64748b" size={16} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity onPress={signOut} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl items-center mb-20">
        <Text className="text-rose-400 font-bold">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
