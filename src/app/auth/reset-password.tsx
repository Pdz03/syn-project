import { useEffect, useState } from 'react'

import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  router,
  useLocalSearchParams,
} from 'expo-router'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynButton, SynInput } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string
    access_token?: string
    refresh_token?: string
    error?: string
    error_description?: string
  }>()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    prepareSession()
  }, [])

  async function prepareSession() {
    try {
      if (params.error) {
        Alert.alert(
          'Invalid reset link',
          params.error_description ?? params.error
        )

        router.replace('/(auth)/login')
        return
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          params.code
        )

        if (error) {
          console.error('RESET EXCHANGE CODE:', error)

          Alert.alert('Invalid reset link', error.message)

          return
        }

        setSessionReady(true)
        return
      }

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        })

        if (error) {
          console.error('RESET SET SESSION:', error)

          Alert.alert('Invalid reset link', error.message)

          return
        }

        setSessionReady(true)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setSessionReady(true)
      }
    } catch (error) {
      console.error('PREPARE RESET SESSION:', error)
    }
  }

  async function handleUpdatePassword() {
    if (!sessionReady) {
      Alert.alert('Please wait', 'Reset session belum siap.')
      return
    }

    if (password.length < 8) {
      Alert.alert('Password too short', 'Gunakan minimal 8 karakter.')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Konfirmasi password belum sama.')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        console.error('UPDATE PASSWORD ERROR:', error)

        Alert.alert('Unable to update password', error.message)

        return
      }

      Alert.alert(
        'Password updated',
        'Password Syn kamu berhasil diganti.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/'),
          },
        ]
      )
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
          <Text style={styles.title}>create new password</Text>
          <Text style={styles.subtitle}>
            choose a new password for your Syn account
          </Text>
        </View>

        <View style={styles.form}>
          <SynInput
            label="new password"
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
            label="confirm new password"
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
          title={sessionReady ? 'update password' : 'preparing...'}
          loading={loading}
          disabled={!sessionReady}
          onPress={handleUpdatePassword}
        />
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
})
