import { useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native'

import { router } from 'expo-router'

import {
  supabase,
} from '@/lib/supabase'

import {
  useAuth,
} from '@/providers/auth-provider'

import {
  Colors,
} from '@/constants/colors'

export default function WelcomeScreen() {
  const {
    profile,
    refreshProfile,
  } = useAuth()

  const [
    loading,
    setLoading,
  ] = useState(false)

  async function handleEnterSyn() {
    if (!profile) return

    try {
      setLoading(true)

      const { error } =
        await supabase
          .from('profiles')
          .update({
            onboarding_completed:
              true,
          })
          .eq('id', profile.id)

      if (error) {
        console.error(
          'ONBOARDING ERROR:',
          error
        )

        Alert.alert(
          'Error',
          'Gagal menyelesaikan onboarding.'
        )

        return
      }

      await refreshProfile()

      router.replace('/(tabs)')
    } finally {
      setLoading(false)
    }
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
          color:
            Colors.primary,
        }}
      >
        syn
      </Text>

      <Text
        style={{
          marginTop: 32,
          fontSize: 30,
          fontWeight: '800',
          color: Colors.ink,
        }}
      >
        Welcome to Syn 👋
      </Text>

      <Text
        style={{
          marginTop: 10,
          color: Colors.muted,
          fontSize: 16,
        }}
      >
        Your account is ready.
      </Text>

      <View
        style={{
          marginTop: 40,
          padding: 24,
          borderRadius: 20,
          backgroundColor:
            Colors.surface,

          borderWidth: 1,
          borderColor:
            Colors.border,
        }}
      >
        <Text
          style={{
            color: Colors.muted,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          YOUR SYN ID
        </Text>

        <Text
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: '800',
            letterSpacing: 2,
            color: Colors.ink,
          }}
        >
          {profile?.syn_id}
        </Text>

        <Text
          style={{
            marginTop: 12,
            lineHeight: 20,
            color: Colors.muted,
          }}
        >
          This is your permanent
          Syn ID. Share it with
          people you want to
          connect with.
        </Text>
      </View>

      <Pressable
        onPress={
          handleEnterSyn
        }
        disabled={loading}
        style={{
          marginTop: 32,
          paddingVertical: 16,
          alignItems: 'center',
          borderRadius: 14,
          backgroundColor:
            Colors.primary,

          opacity:
            loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            Enter Syn
          </Text>
        )}
      </Pressable>
    </View>
  )
}