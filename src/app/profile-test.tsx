import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'

type Profile = {
  id: string
  syn_id: string
  username: string | null
  display_name: string | null
}

export default function ProfileTestScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setErrorMessage('User tidak ditemukan.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, syn_id, username, display_name')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error(error)
        setErrorMessage(error.message)
        return
      }

      setProfile(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    )
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
      {errorMessage ? (
        <Text>{errorMessage}</Text>
      ) : (
        <>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: Colors.primary,
            }}
          >
            syn
          </Text>

          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              marginTop: 24,
              color: Colors.ink,
            }}
          >
            {profile?.display_name || 'Syn User'}
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: Colors.secondary,
            }}
          >
            @{profile?.username || 'no-username'}
          </Text>

          <Text
            style={{
              marginTop: 24,
              fontSize: 14,
              color: Colors.muted,
            }}
          >
            Your Syn ID
          </Text>

          <Text
            style={{
              marginTop: 6,
              fontSize: 28,
              fontWeight: '800',
              letterSpacing: 2,
              color: Colors.ink,
            }}
          >
            {profile?.syn_id}
          </Text>
        </>
      )}
    </View>
  )
}