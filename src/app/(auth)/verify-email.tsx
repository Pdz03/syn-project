import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native'

import {
  router,
  useLocalSearchParams,
} from 'expo-router'

import {
  supabase,
} from '@/lib/supabase'

import {
  Colors,
} from '@/constants/colors'

export default function VerifyEmailScreen() {
  const { email } =
    useLocalSearchParams<{
      email: string
    }>()

  async function resendEmail() {
    if (!email) return

    const { error } =
      await supabase.auth.resend({
        type: 'signup',
        email,
      })

    if (error) {
      Alert.alert(
        'Gagal',
        error.message
      )

      return
    }

    Alert.alert(
      'Email terkirim',
      'Cek inbox kamu lagi.'
    )
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          'center',

        padding: 24,

        backgroundColor:
          Colors.background,
      }}
    >
      <Text
        style={{
          fontSize: 42,
          fontWeight: '800',
          color: Colors.primary,
        }}
      >
        syn
      </Text>

      <Text
        style={{
          marginTop: 24,
          fontSize: 26,
          fontWeight: '700',
          color: Colors.ink,
        }}
      >
        Check your email
      </Text>

      <Text
        style={{
          marginTop: 12,
          lineHeight: 22,
          color: Colors.muted,
        }}
      >
        We sent a verification
        link to:
      </Text>

      <Text
        style={{
          marginTop: 4,
          fontWeight: '700',
          color: Colors.ink,
        }}
      >
        {email}
      </Text>

      <Pressable
        onPress={resendEmail}
        style={{
          marginTop: 32,
        }}
      >
        <Text
          style={{
            color:
              Colors.secondary,

            fontWeight: '600',
          }}
        >
          Resend verification email
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.replace(
            '/(auth)/login'
          )
        }
        style={{
          marginTop: 24,
        }}
      >
        <Text
          style={{
            color: Colors.muted,
          }}
        >
          Back to Sign In
        </Text>
      </Pressable>
    </View>
  )
}