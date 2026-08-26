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
import { SynBrandLogo, SynButton, SynInput } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetRequest() {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      Alert.alert('Email required', 'Masukkan email akun Syn kamu.')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: 'syn://auth/reset-password',
        }
      )

      if (error) {
        console.error('RESET PASSWORD EMAIL ERROR:', error)

        Alert.alert('Unable to send email', error.message)

        return
      }

      Alert.alert(
        'Check your email',
        'Kami sudah mengirim link untuk mengganti password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
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
        <SynBrandLogo />
      </View>

      <View style={styles.content}>
        <View>
          <Text style={styles.title}>forgot password?</Text>
          <Text style={styles.subtitle}>
            enter the email connected to your Syn account
          </Text>
        </View>

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

        <SynButton
          title="send reset link"
          loading={loading}
          onPress={handleResetRequest}
        />

        <Pressable
          onPress={() => router.back()}
          style={styles.bottomLink}
        >
          <Text style={styles.linkText}>Back to login</Text>
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
  bottomLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: Colors.secondary,
    fontWeight: '700',
  },
})
