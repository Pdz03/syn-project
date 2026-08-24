import { useState } from 'react'

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { router } from 'expo-router'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynButton, SynInput } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Login gagal', 'Email dan password wajib diisi.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
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
    <View style={styles.screen}>
      <View style={styles.brandRow}>
        <Text style={styles.logo}>syn</Text>
      </View>

      <View style={styles.content}>
        <View>
          <Text style={styles.title}>welcome back</Text>
          <Text style={styles.subtitle}>stay close to your people</Text>
        </View>

        <View style={styles.form}>
          <SynInput
            label="email"
            leftIcon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <SynInput
            label="password"
            leftIcon="lock-closed-outline"
            placeholder="your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            textContentType="password"
            rightIcon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            onPressRightIcon={() => setPasswordVisible((visible) => !visible)}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>
        </View>

        <SynButton
          title="sign in"
          loading={loading}
          onPress={handleLogin}
        />

        <Pressable
          onPress={() => router.push('/(auth)/register')}
          style={styles.bottomLink}
        >
          <Text style={styles.bottomLinkText}>
            New to Syn? <Text style={styles.linkText}>Create account</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  brandRow: {
    paddingTop: 58,
    paddingHorizontal: SynSpacing.gutter,
  },
  logo: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SynSpacing.xxl,
    paddingBottom: 34,
    gap: 28,
  },
  title: {
    color: Colors.ink,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 8,
    color: Colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  form: {
    gap: 16,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  linkText: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  bottomLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  bottomLinkText: {
    color: Colors.muted,
  },
})
