import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';
const NOTIFICATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

let timeLeftHome: number | null = null;
let notificationSent = false;

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const currentLocation = locations[0];

    // Read home location and radius from AsyncStorage (set by Settings or Onboarding)
    const storedLat = await AsyncStorage.getItem('home_lat');
    const storedLng = await AsyncStorage.getItem('home_lng');
    const storedRadius = await AsyncStorage.getItem('home_radius');

    if (!storedLat || !storedLng) return; // No home set, skip

    const homeLat = parseFloat(storedLat);
    const homeLng = parseFloat(storedLng);
    const radiusMeters = storedRadius ? parseInt(storedRadius, 10) : 1000;

    const distance = getDistanceFromLatLonInMeters(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      homeLat,
      homeLng
    );

    if (distance > radiusMeters) {
      if (!timeLeftHome) {
        timeLeftHome = Date.now();
        notificationSent = false;
      } else if (Date.now() - timeLeftHome > NOTIFICATION_TIMEOUT_MS && !notificationSent) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "You've been out for a while!",
            body: 'Are you spending money? Don\'t forget to log it in BudgyTrack!',
            data: { action: 'expense_prompt' },
          },
          trigger: null,
        });
        notificationSent = true;
      }
    } else {
      // User is back home
      timeLeftHome = null;
      notificationSent = false;
    }
  }
});

export async function startLocationTracking(homeLat: number, homeLon: number) {
  // Cache coordinates for background task access
  await AsyncStorage.setItem('home_lat', homeLat.toString());
  await AsyncStorage.setItem('home_lng', homeLon.toString());

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status === 'granted') {
    // Stop existing task if running
    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTracking) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch { /* not started yet */ }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 20,
      showsBackgroundLocationIndicator: false,
    });
  }
}

export async function stopLocationTracking() {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch { /* not started */ }
}
