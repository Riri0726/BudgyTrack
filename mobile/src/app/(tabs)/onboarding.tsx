import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';

export default function Onboarding() {
  const requestLocationPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert('Permission Denied', 'We need foreground location to find your home.');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus === 'granted') {
      Alert.alert('Success', 'Background location tracking is enabled. Geofencing is active!');
    } else {
      Alert.alert('Permission Denied', 'Background location is required for the geofencing feature to remind you to log expenses.');
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-6">
      <View className="bg-slate-800 p-8 rounded-3xl items-center shadow-xl w-full">
        <View className="bg-blue-500/20 p-5 rounded-full mb-6">
          <MapPin color="#3b82f6" size={48} />
        </View>
        <Text className="text-2xl font-bold text-white text-center mb-4">Location Features</Text>
        <Text className="text-slate-400 text-center text-base mb-8 leading-6">
          BudgyTrack uses your location in the background to remind you to log your expenses when you are more than 1km away from your house for over 10 minutes. 
          {'\n\n'}
          This feature strictly uses Local Notifications and your location data never leaves your device.
        </Text>

        <TouchableOpacity 
          className="bg-blue-500 w-full py-4 rounded-xl items-center shadow-lg shadow-blue-500/30"
          onPress={requestLocationPermissions}
        >
          <Text className="text-white font-semibold text-lg">Enable Location Access</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="mt-4 py-2">
          <Text className="text-slate-500 font-medium">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
