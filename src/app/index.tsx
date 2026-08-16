import { Redirect } from 'expo-router'

import {
  useAuth,
} from '@/providers/auth-provider'

export default function Index() {
  const {
    session,
    profile,
    loading,
    profileLoading,
  } = useAuth()

  if (
    loading ||
    profileLoading
  ) {
    return null
  }

  if (!session) {
    return (
      <Redirect
        href="/(auth)/login"
      />
    )
  }

  const profileComplete =
    Boolean(
      profile?.display_name &&
      profile?.username
    )

  if (!profileComplete) {
    return (
      <Redirect
        href="/(setup)/profile"
      />
    )
  }

  if (
    !profile?.onboarding_completed
  ) {
    return (
      <Redirect
        href="/(setup)/welcome"
      />
    )
  }

  return (
    <Redirect
      href="/(tabs)"
    />
  )
}