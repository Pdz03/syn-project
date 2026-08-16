import {
  Pressable,
  Text,
  View,
} from 'react-native'

import {
  supabase,
} from '@/lib/supabase'

import {
  useAuth,
} from '@/providers/auth-provider'

import {
  Colors,
} from '@/constants/colors'

export default function UpdatesScreen() {
  const { profile } =
    useAuth()

  async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('LOGOUT ERROR:', error)
  }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          'center',

        alignItems: 'center',

        backgroundColor:
          Colors.background,
      }}
    >
      <Text
        style={{
          fontSize: 36,
          fontWeight: '800',
          color:
            Colors.primary,
        }}
      >
        syn
      </Text>

      <Text
        style={{
          marginTop: 16,
          color: Colors.ink,
        }}
      >
        Welcome,
        {' '}
        {profile?.display_name}
      </Text>

      <Text
        style={{
          marginTop: 8,
          color:
            Colors.secondary,
        }}
      >
        {profile?.syn_id}
      </Text>

      <Pressable
        onPress={handleLogout}
        style={{
          marginTop: 32,
        }}
      >
        <Text
          style={{
            color: Colors.muted,
          }}
        >
          Logout
        </Text>
      </Pressable>
    </View>
  )
}