import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { User, MapPin, Plus, Trash2, Tag, Palette, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeType } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startLocationTracking } from '../../lib/locationTask';
import { WebView } from 'react-native-webview';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme, mode, setMode, colors } = useTheme();

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
  const [radiusMeters, setRadiusMeters] = useState(50); // Set 50m as initial default
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const fetchProfile = useCallback(async () => {
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
          setRadiusMeters(data.home_radius_meters || 50);
          setRadiusEnabled(true);
        }
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchCategories = useCallback(async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error(err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCategories();
    }
  }, [user, fetchProfile, fetchCategories]);

  // Inject Leaflet updates smoothly to WebView map instead of full reloads
  useEffect(() => {
    if (webViewRef.current && homeLat && homeLng) {
      const js = `
        if (typeof marker !== 'undefined' && typeof circle !== 'undefined' && typeof map !== 'undefined') {
          var pos = [${homeLat}, ${homeLng}];
          marker.setLatLng(pos);
          circle.setLatLng(pos);
          circle.setRadius(${radiusMeters});
          map.setView(pos, map.getZoom());
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [homeLat, homeLng, radiusMeters]);

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
      if (radiusEnabled && homeLat && homeLng) {
        await startLocationTracking(homeLat, homeLng);
      }
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

  // Handle updates dragged/clicked on map
  const onMapMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        setHomeLat(data.lat);
        setHomeLng(data.lng);
        // Save to Supabase
        await supabase.from('profiles').update({ home_lat: data.lat, home_lng: data.lng }).eq('id', user?.id);
        // Cache locally for background task
        await AsyncStorage.setItem('home_lat', data.lat.toString());
        await AsyncStorage.setItem('home_lng', data.lng.toString());
        // Re-start tracking if enabled
        if (radiusEnabled) {
          await startLocationTracking(data.lat, data.lng);
        }
      }
    } catch (err: any) {
      console.error('Error handling map updates:', err.message);
    }
  };

  const themesList = [
    { id: 'red', name: 'Crimson Core', color: '#ef4444' },
    { id: 'blue', name: 'Azure Deep', color: '#3b82f6' },
    { id: 'purple', name: 'Amethyst Flow', color: '#a78bfa' },
    { id: 'galaxy', name: 'Galaxy Space', color: '#f472b6' },
  ];

  // Available radius options starting from 50m
  const radiusOptions = [50, 100, 250, 500, 1000, 2000, 5000];

  const getMapHtml = (lat: number, lng: number, radius: number, primaryColor: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #121620; }
        .leaflet-control-attribution { display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
        var circle = L.circle([${lat}, ${lng}], {
          color: '${primaryColor}',
          fillColor: '${primaryColor}',
          fillOpacity: 0.2,
          radius: ${radius}
        }).addTo(map);

        function updateApp(newLat, newLng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: newLat, lng: newLng }));
        }

        marker.on('dragend', function(e) {
          var position = marker.getLatLng();
          circle.setLatLng(position);
          map.panTo(position);
          updateApp(position.lat, position.lng);
        });

        map.on('click', function(e) {
          var position = e.latlng;
          marker.setLatLng(position);
          circle.setLatLng(position);
          map.panTo(position);
          updateApp(position.lat, position.lng);
        });
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} className="flex-1 p-4" showsVerticalScrollIndicator={false}>

      {/* ===== PROFILE SECTION ===== */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-4">
        <View className="flex-row items-center mb-4">
          <View style={{ backgroundColor: colors.primary + '15' }} className="p-2.5 rounded-xl mr-3">
            <User color={colors.primary} size={20} />
          </View>
          <Text style={{ color: colors.text }} className="font-bold text-base">Profile</Text>
        </View>

        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">First Name</Text>
        <TextInput value={fname} onChangeText={setFname} placeholder="Jane" placeholderTextColor={colors.textMuted}
          style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
          className="p-3 rounded-xl mb-3 border" />

        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Last Name</Text>
        <TextInput value={lname} onChangeText={setLname} placeholder="Doe" placeholderTextColor={colors.textMuted}
          style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
          className="p-3 rounded-xl mb-4 border" />

        <TouchableOpacity onPress={handleUpdateProfile} disabled={profileLoading}
          style={{ backgroundColor: colors.primary, opacity: profileLoading ? 0.6 : 1 }}
          className="p-3.5 rounded-xl items-center">
          <Text className="text-white font-bold">{profileLoading ? 'Saving...' : 'Update Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* ===== APPEARANCE / THEME SECTION ===== */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-4">
        <View className="flex-row items-center mb-4">
          <View style={{ backgroundColor: colors.primary + '15' }} className="p-2.5 rounded-xl mr-3">
            <Palette color={colors.primary} size={20} />
          </View>
          <Text style={{ color: colors.text }} className="font-bold text-base">Theme & Appearance</Text>
        </View>

        {/* Theme Picker */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-3">Theme Color</Text>
        <View className="flex-row justify-between mb-5" style={{ gap: 6 }}>
          {themesList.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id as ThemeType)}
              style={{
                borderColor: theme === t.id ? colors.primary : colors.border,
                backgroundColor: theme === t.id ? colors.primary + '15' : colors.surface,
              }}
              className="flex-1 p-3 rounded-xl border items-center justify-center"
            >
              <View style={{ backgroundColor: t.color }} className="w-5 h-5 rounded-full mb-1" />
              <Text style={{ color: colors.text }} className="text-[9px] font-bold text-center">{t.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode Picker */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Appearance Mode</Text>
        <View className="flex-row p-1 rounded-xl" style={{ backgroundColor: colors.surface, gap: 4 }}>
          <TouchableOpacity onPress={() => setMode('light')}
            style={{
              backgroundColor: mode === 'light' ? colors.card : 'transparent',
              borderColor: mode === 'light' ? colors.border : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2.5 rounded-lg items-center justify-center flex-row"
          >
            <Sun size={14} color={mode === 'light' ? colors.primary : colors.textMuted} className="mr-1.5" />
            <Text style={{ color: mode === 'light' ? colors.primary : colors.textMuted }} className="font-semibold text-xs">Light</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('dark')}
            style={{
              backgroundColor: mode === 'dark' ? colors.card : 'transparent',
              borderColor: mode === 'dark' ? colors.border : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2.5 rounded-lg items-center justify-center flex-row"
          >
            <Moon size={14} color={mode === 'dark' ? colors.primary : colors.textMuted} className="mr-1.5" />
            <Text style={{ color: mode === 'dark' ? colors.primary : colors.textMuted }} className="font-semibold text-xs">Dark</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== RADIUS NOTIFICATOR SECTION ===== */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 mr-2">
            <View style={{ backgroundColor: colors.primary + '15' }} className="p-2.5 rounded-xl mr-3">
              <MapPin color={colors.primary} size={20} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-bold text-base">Radius Notificator</Text>
              <Text style={{ color: colors.textMuted }} className="text-xs leading-4 mt-0.5">Get reminded to log expenses away from home</Text>
            </View>
          </View>
          <Switch
            value={radiusEnabled}
            onValueChange={handleToggleRadius}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Visual Map Selector */}
        {homeLat && homeLng ? (
          <View style={{ borderColor: colors.border }} className="w-full h-56 rounded-xl overflow-hidden border mb-4">
            <WebView
              ref={webViewRef}
              source={{ html: getMapHtml(homeLat, homeLng, radiusMeters, colors.primary) }}
              onMessage={onMapMessage}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        ) : null}

        {/* Home location status */}
        <View style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-xl p-4 border mb-4">
          {homeLat && homeLng ? (
            <View>
              <Text style={{ color: colors.primary }} className="text-xs font-bold uppercase mb-1">📍 Pinned Coordinate</Text>
              <Text style={{ color: colors.textMuted }} className="text-xs">
                {homeLat.toFixed(6)}, {homeLng.toFixed(6)} (Tap or drag map marker to adjust)
              </Text>
            </View>
          ) : (
            <Text className="text-amber-500 text-xs font-semibold">No home location set. Pin your current location below.</Text>
          )}
        </View>

        {/* Pin / Re-pin home */}
        <TouchableOpacity onPress={handlePinHomeLocation} disabled={locationLoading}
          style={{
            backgroundColor: colors.primary + '10',
            borderColor: colors.primary + '30',
          }}
          className="p-3.5 rounded-xl items-center mb-4 border">
          <Text style={{ color: colors.primary }} className="font-bold text-sm">
            {locationLoading ? 'Getting GPS...' : homeLat ? '📍 Reset to Current GPS Location' : '📍 Pin Current Location as Home'}
          </Text>
        </TouchableOpacity>

        {/* Radius selector */}
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase tracking-wider mb-2">Notification Radius</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {radiusOptions.map(r => (
            <TouchableOpacity key={r} onPress={() => handleUpdateRadius(r)}
              style={{
                backgroundColor: radiusMeters === r ? colors.primary + '20' : colors.surface,
                borderColor: radiusMeters === r ? colors.primary : colors.border,
              }}
              className="px-4 py-2.5 rounded-xl border mr-2">
              <Text style={{ color: radiusMeters === r ? colors.primary : colors.textMuted }} className="font-bold text-sm">
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={{ color: colors.textMuted }} className="text-[10px] mt-1.5 leading-3">
          {`You'll be notified after being ${radiusMeters >= 1000 ? `${radiusMeters / 1000}km` : `${radiusMeters}m`} from home for 10+ minutes.`}
        </Text>
      </View>

      {/* ===== CATEGORIES SECTION ===== */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl p-5 border mb-4">
        <View className="flex-row items-center mb-4">
          <View style={{ backgroundColor: colors.primary + '15' }} className="p-2.5 rounded-xl mr-3">
            <Tag color={colors.primary} size={20} />
          </View>
          <Text style={{ color: colors.text }} className="font-bold text-base">Categories</Text>
        </View>

        {/* Add Category */}
        <View className="flex-row mb-4" style={{ gap: 8 }}>
          <TextInput value={newCatName} onChangeText={setNewCatName} placeholder="New category..." placeholderTextColor={colors.textMuted}
            style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
            className="flex-1 p-3 rounded-xl border" />
          <TouchableOpacity onPress={handleAddCategory} style={{ backgroundColor: colors.primary }} className="p-3.5 rounded-xl items-center justify-center">
            <Plus color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Type selector for new category */}
        <View className="flex-row mb-4 p-1 rounded-xl" style={{ backgroundColor: colors.surface, gap: 4 }}>
          <TouchableOpacity onPress={() => setNewCatType('expense')}
            style={{
              backgroundColor: newCatType === 'expense' ? colors.card : 'transparent',
              borderColor: newCatType === 'expense' ? colors.border : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2 rounded-lg items-center"
          >
            <Text style={{ color: newCatType === 'expense' ? '#ef4444' : colors.textMuted }} className="font-semibold text-xs">Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNewCatType('income')}
            style={{
              backgroundColor: newCatType === 'income' ? colors.card : 'transparent',
              borderColor: newCatType === 'income' ? colors.border : 'transparent',
              borderWidth: 1,
            }}
            className="flex-1 py-2 rounded-lg items-center"
          >
            <Text style={{ color: newCatType === 'income' ? '#10b981' : colors.textMuted }} className="font-semibold text-xs">Income</Text>
          </TouchableOpacity>
        </View>

        {/* Category list */}
        <View className="mt-2">
          {categories.map(cat => (
            <View key={cat.id} style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="flex-row items-center justify-between p-3.5 rounded-xl border mb-2 shadow-sm">
              <View className="flex-row items-center flex-1">
                <View className={`w-2.5 h-2.5 rounded-full mr-3 ${cat.type === 'expense' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <View>
                  <Text style={{ color: colors.text }} className="font-bold text-sm">{cat.name}</Text>
                  <Text style={{ color: colors.textMuted }} className="text-[9px] uppercase font-extrabold mt-0.5 tracking-wider">{cat.type}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5">
                <Trash2 color="#ef4444" size={16} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity onPress={signOut} style={{ borderColor: '#ef444430', backgroundColor: '#ef444410' }} className="border p-4 rounded-2xl items-center mb-20">
        <Text className="text-rose-500 font-bold text-sm">Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
