import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'

import { useAuth } from '@/providers/auth-provider'

export default function AuthLayout() {
  const {
    session,
    profile,
    loading,
    profileLoading,
  } = useAuth()

  if (loading || profileLoading) {
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

  if (session) {
    const profileComplete = Boolean(
      profile?.display_name &&
      profile?.username
    )

    if (!profileComplete) {
      return <Redirect href="/(setup)/profile" />
    }

    if (!profile?.onboarding_completed) {
      return <Redirect href="/(setup)/welcome" />
    }

    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  )
}