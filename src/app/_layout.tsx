import {
  ActivityIndicator,
  View,
} from 'react-native'

import { Stack } from 'expo-router'

import {
  AuthProvider,
  useAuth,
} from '@/providers/auth-provider'

function RootNavigator() {
  const {
    loading,
    profileLoading,
  } = useAuth()

  if (
    loading ||
    profileLoading
  ) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}