import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import {
  router,
  useLocalSearchParams,
} from 'expo-router'

import { Ionicons } from '@expo/vector-icons'

import { Colors, SynRadius, SynSpacing } from '@/constants/colors'
import { SynButton, SynCard } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{
    email?: string
  }>()

  async function handleResend() {
    if (!email) {
      Alert.alert('Error', 'Email tidak ditemukan.')
      return
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: 'syn://auth/callback',
      },
    })

    if (error) {
      console.error('RESEND EMAIL ERROR:', error)

      Alert.alert('Unable to resend', error.message)

      return
    }

    Alert.alert('Email sent', 'Verification email sudah dikirim ulang.')
  }

  return (
    <View style={styles.screen}>
      <View style={styles.brandRow}>
        <Text style={styles.logo}>syn</Text>
      </View>

      <View style={styles.content}>
        <SynCard style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="mail-unread-outline"
              size={30}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.title}>check your email</Text>

          <Text style={styles.body}>We sent a verification link to:</Text>

          <Text style={styles.email}>{email ?? 'your email'}</Text>

          <Text style={styles.body}>
            Tap the verification link in your email to activate your Syn account.
          </Text>

          <SynButton
            title="resend verification email"
            onPress={handleResend}
            style={styles.primaryButton}
          />

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>
        </SynCard>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingBottom: SynSpacing.xxxl,
  },
  card: {
    padding: 24,
    borderRadius: 24,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: SynRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  title: {
    marginTop: 22,
    color: Colors.ink,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  body: {
    marginTop: 14,
    color: Colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  email: {
    marginTop: 6,
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 28,
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: Colors.secondary,
    fontWeight: '700',
  },
})
