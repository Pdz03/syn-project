import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Login gagal', 'Email dan password wajib diisi.')
      return
    }

    try {
      setLoading(true)

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (error) {
        Alert.alert('Login gagal', error.message)
        return
      }

      console.log('LOGIN SUCCESS:', data.user.email)

      router.replace('/profile-test')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'Terjadi kesalahan saat login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: Colors.background,
      }}
    >
      <Text
        style={{
          fontSize: 42,
          fontWeight: '800',
          color: Colors.primary,
          marginBottom: 8,
        }}
      >
        syn
      </Text>

      <Text
        style={{
          fontSize: 18,
          color: Colors.ink,
          marginBottom: 32,
        }}
      >
        Sign in to your account
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          marginBottom: 20,
        }}
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: Colors.primary,
          paddingVertical: 16,
          borderRadius: 14,
          alignItems: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            Sign In
          </Text>
        )}
      </Pressable>
      <Pressable
  onPress={() =>
    router.push('/(auth)/register')
  }
  style={{
    marginTop: 20,
    alignItems: 'center',
  }}
>
  <Text
    style={{
      color: Colors.secondary,
    }}
  >
    New to Syn? Create account
  </Text>
</Pressable>
    </View>
  )
}