import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { startLocationTracking } from '../lib/locationTask';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const { colors } = useTheme();
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
      const defaultRadius = 50;

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
    <View style={{ backgroundColor: colors.background }} className="flex-1 justify-center items-center p-6">
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="p-8 rounded-3xl items-center border w-full">
        <View style={{ backgroundColor: colors.primary + '15' }} className="p-5 rounded-full mb-6">
          <MapPin color={colors.primary} size={48} />
        </View>
        <Text style={{ color: colors.text }} className="text-2xl font-bold text-center mb-4">Radius Notificator</Text>
        <Text style={{ color: colors.textMuted }} className="text-center text-sm mb-8 leading-5">
          {"BudgyTrack can remind you to log expenses when you've been away from home for more than 10 minutes."}
          {'\n\n'}
          {"Your location data never leaves your device — notifications are 100% local."}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary }}
              className="w-full py-4 rounded-xl items-center mb-3"
              onPress={handleSetupLocation}
            >
              <Text className="text-white font-bold text-base">📍 Pin Home & Enable</Text>
            </TouchableOpacity>

            <TouchableOpacity className="py-3" onPress={handleSkip}>
              <Text style={{ color: colors.textMuted }} className="font-semibold">Skip for now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
