import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startLocationTracking } from '../lib/locationTask';

function RootLayoutNav() {
  const { user, loading, hasOnboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Check if we need onboarding (no wallets set up)
      if (hasOnboarded === false) {
        router.replace('/onboarding');
      } else {
        router.replace('/');
      }
    } else if (user && hasOnboarded === false && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, loading, hasOnboarded, segments]);

  // Boot geofencing if home location is cached
  useEffect(() => {
    if (user) {
      bootGeofencing();
    }
  }, [user]);

  const bootGeofencing = async () => {
    try {
      const lat = await AsyncStorage.getItem('home_lat');
      const lng = await AsyncStorage.getItem('home_lng');
      if (lat && lng) {
        await startLocationTracking(parseFloat(lat), parseFloat(lng));
      }
    } catch {
      // Silently fail — location permissions might not be granted yet
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <Slot />;
}

export default function AppLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
