import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Landmark } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Sign up
        const { data, error } = await signUp(email, password, { first_name: fname, last_name: lname });
        if (error) throw error;
        
        if (data?.user) {
          // Initialize profile explicitly
          await supabase.from('profiles').insert([
            { id: data.user.id, first_name: fname, last_name: lname }
          ]);
          alert('Sign up successful! Please check your email for confirmation or login now.');
          setIsRegistering(false);
        }
      } else {
        // Sign in
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }}>
        <View className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700/50">
          <View className="items-center mb-6">
            <View className="p-3 bg-blue-500/10 rounded-xl mb-3">
              <Landmark color="#3b82f6" size={32} />
            </View>
            <Text className="text-2xl font-bold text-white mb-1">BudgyTrack Account</Text>
            <Text className="text-sm text-slate-400 text-center">
              {isRegistering ? 'Create your budget planner profile' : 'Sign in to access your dashboard'}
            </Text>
          </View>

          {errorMsg ? (
            <View className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl mb-4">
              <Text className="text-rose-400 text-xs font-semibold text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            {isRegistering && (
              <View className="flex-row space-x-4 mb-4">
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">First Name</Text>
                  <TextInput
                    value={fname}
                    onChangeText={setFname}
                    placeholder="Jane"
                    placeholderTextColor="#475569"
                    className="bg-slate-900 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                  />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Last Name</Text>
                  <TextInput
                    value={lname}
                    onChangeText={setLname}
                    placeholder="Doe"
                    placeholderTextColor="#475569"
                    className="bg-slate-900 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:border-blue-500"
                  />
                </View>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-900 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:border-blue-500"
              />
            </View>

            <View className="mb-6">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry
                className="bg-slate-900 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:border-blue-500"
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`w-full py-4 rounded-xl items-center shadow-lg mb-6 ${loading ? 'bg-blue-500/50' : 'bg-blue-500 shadow-blue-500/30'}`}
            >
              <Text className="text-white font-semibold text-sm">
                {loading ? 'Please wait...' : isRegistering ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center items-center mt-2">
            <Text className="text-slate-400 text-xs">
              {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}>
              <Text className="text-blue-400 text-xs font-semibold">
                {isRegistering ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
