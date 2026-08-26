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
import { supabase } from '@/lib/supabase'

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
  async function handleNotificationResponse(
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
        const unreadCount =
          await getNotificationUnreadCount(
            conversationId
          )

        router.push({
          pathname: '/chat/[id]',
          params: {
            id: conversationId,
            unreadCount: String(unreadCount),
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

async function getNotificationUnreadCount(
  conversationId: string
) {
  const { data, error } =
    await supabase.rpc(
      'get_my_chats_with_receipts'
    )

  if (error) {
    console.warn(
      'NOTIFICATION UNREAD COUNT:',
      error.message
    )
    return 0
  }

  const chat = (
    data as Array<{
      conversation_id: string
      unread_count: number
    }> | null
  )?.find(
    (item) =>
      item.conversation_id ===
      conversationId
  )

  return Number(chat?.unread_count ?? 0)
}
