import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { startLocationTracking } from '../lib/locationTask';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSetupLocation = async () => {
    setLoading(true);
    try {
      // 1. Request foreground permission
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Permission Denied', 'We need location permission to set your home area.');
        setLoading(false);
        return;
      }

      // 2. Get current position as "home"
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const defaultRadius = 1000;

      // 3. Save to Supabase
      const { error } = await supabase.from('profiles').update({
        home_lat: lat,
        home_lng: lng,
        home_radius_meters: defaultRadius,
      }).eq('id', user?.id);
      if (error) throw error;

      // 4. Cache locally for background task
      await AsyncStorage.setItem('home_lat', lat.toString());
      await AsyncStorage.setItem('home_lng', lng.toString());
      await AsyncStorage.setItem('home_radius', defaultRadius.toString());

      // 5. Request background permission and start tracking
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await startLocationTracking(lat, lng);
      }

      Alert.alert('Home Pinned!', `Your home has been set. You can adjust the radius in Settings.`);
      completeOnboarding();
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-6">
      <View className="bg-slate-800 p-8 rounded-3xl items-center shadow-xl w-full border border-slate-700/30">
        <View className="bg-blue-500/20 p-5 rounded-full mb-6">
          <MapPin color="#3b82f6" size={48} />
        </View>
        <Text className="text-2xl font-bold text-white text-center mb-4">Radius Notificator</Text>
        <Text className="text-slate-400 text-center text-base mb-8 leading-6">
          BudgyTrack can remind you to log expenses when you've been away from home for more than 10 minutes.
          {'\n\n'}
          Your location data never leaves your device — notifications are 100% local.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : (
          <>
            <TouchableOpacity
              className="bg-blue-500 w-full py-4 rounded-xl items-center shadow-lg shadow-blue-500/30 mb-3"
              onPress={handleSetupLocation}
            >
              <Text className="text-white font-semibold text-lg">📍 Pin Home & Enable</Text>
            </TouchableOpacity>

            <TouchableOpacity className="py-3" onPress={handleSkip}>
              <Text className="text-slate-500 font-medium">Skip for now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
