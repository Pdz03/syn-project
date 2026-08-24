import {
  ActivityIndicator,
  View,
} from 'react-native'

import { Stack } from 'expo-router'

import {
  AuthProvider,
  useAuth,
} from '@/providers/auth-provider'

import { useEffect } from 'react'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'

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
  useEffect(() => {
  function handleNotificationResponse(
    response: Notifications.NotificationResponse
  ) {
    const data =
      response.notification.request.content.data

    console.log(
      'NOTIFICATION TAP:',
      data
    )

    // Message / Nudge
    if (
      data?.type === 'message' ||
      data?.type === 'nudge'
    ) {
      const conversationId =
        data.conversationId as
          | string
          | undefined

      if (conversationId) {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: conversationId,
          },
        })
      }

      return
    }

    // Syn Request
    if (
      data?.type === 'syn_request'
    ) {
      router.push(
        '/syn-requests'
      )

      return
    }
  }

  // App sedang hidup/background
  // lalu user tap notif
  const subscription =
    Notifications
      .addNotificationResponseReceivedListener(
        handleNotificationResponse
      )

  // App tadinya benar-benar tertutup
  // lalu dibuka lewat notif
  Notifications
    .getLastNotificationResponseAsync()
    .then((response) => {
      if (response) {
        handleNotificationResponse(
          response
        )
      }
    })
    .catch((error) => {
      console.error(
        'INITIAL NOTIFICATION ERROR:',
        error
      )
    })

  return () => {
    subscription.remove()
  }
}, [])

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}