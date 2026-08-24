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

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password || !confirmPassword) {
      Alert.alert('Belum lengkap', 'Isi semua field terlebih dahulu.')

      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Password berbeda', 'Konfirmasi password harus sama.')

      return
    }

    if (password.length < 8) {
      Alert.alert('Password terlalu pendek', 'Gunakan minimal 8 karakter.')

      return
    }

    try {
      setLoading(true)

      console.log('REGISTER START')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: 'syn://auth/callback',
        },
      })

      if (error) {
        Alert.alert('Registrasi gagal', error.message)

        return
      }

      if (!data.session) {
        router.replace({
          pathname: '/(auth)/check-email',

          params: {
            email: email.trim(),
          },
        })

        return
      }

      console.log('REGISTER RESULT:', data, error)
      router.replace('/')
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
          <Text style={styles.title}>create your account</Text>
          <Text style={styles.subtitle}>
            we'll send a verification link to your email
          </Text>
        </View>

        <View style={styles.form}>
          <SynInput
            label="email"
            leftIcon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <SynInput
            label="password"
            leftIcon="lock-closed-outline"
            placeholder="minimum 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            textContentType="newPassword"
            rightIcon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            onPressRightIcon={() => setPasswordVisible((visible) => !visible)}
          />

          <SynInput
            label="confirm password"
            leftIcon="shield-checkmark-outline"
            placeholder="repeat password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!confirmPasswordVisible}
            textContentType="newPassword"
            rightIcon={confirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
            onPressRightIcon={() => setConfirmPasswordVisible((visible) => !visible)}
          />
        </View>

        <SynButton
          title="create account"
          loading={loading}
          onPress={handleRegister}
        />

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={styles.bottomLink}
        >
          <Text style={styles.bottomLinkText}>
            Already have an account? <Text style={styles.linkText}>Sign in</Text>
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
