import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS_METERS = 1000; // 1km
const NOTIFICATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// In a real app, this would be fetched from Supabase/AsyncStorage
let homeLocation = { latitude: 0, longitude: 0 };
let timeLeftHome: number | null = null;
let notificationSent = false;

// Haversine formula to calculate distance between two coordinates
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in m
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const currentLocation = locations[0];

    // Check distance from home
    const distance = getDistanceFromLatLonInMeters(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      homeLocation.latitude,
      homeLocation.longitude
    );

    if (distance > GEOFENCE_RADIUS_METERS) {
      if (!timeLeftHome) {
        timeLeftHome = Date.now();
        notificationSent = false;
      } else if (Date.now() - timeLeftHome > NOTIFICATION_TIMEOUT_MS && !notificationSent) {
        // User has been out for > 10 minutes
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "You've been out for a while!",
            body: 'Are you spending money? Don\'t forget to log it!',
            data: { action: 'expense_prompt' },
          },
          trigger: null, // Send immediately
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
  homeLocation = { latitude: homeLat, longitude: homeLon };
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status === 'granted') {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // Update every minute
      distanceInterval: 100, // Or every 100 meters
      showsBackgroundLocationIndicator: false,
    });
  }
}
