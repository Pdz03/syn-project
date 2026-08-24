import { Platform } from 'react-native'

import * as Device
  from 'expo-device'

import * as Notifications
  from 'expo-notifications'

import Constants
  from 'expo-constants'

import { supabase }
  from '@/lib/supabase'


Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
})


export async function
registerForPushNotifications(
  userId: string
) {
  if (!Device.isDevice) {
    console.log(
      'Push notification requires a physical device.'
    )

    return null
  }

  if (Platform.OS === 'android') {
    await Notifications
      .setNotificationChannelAsync(
        'default',
        {
          name: 'Syn',
          importance:
            Notifications
              .AndroidImportance
              .DEFAULT,

          vibrationPattern:
            [0, 250, 250, 250],
        }
      )
  }

  const existingPermission =
    await Notifications
      .getPermissionsAsync()

  let finalStatus =
    existingPermission.status

  if (
    finalStatus !==
    'granted'
  ) {
    const requestedPermission =
      await Notifications
        .requestPermissionsAsync()

    finalStatus =
      requestedPermission.status
  }

  if (
    finalStatus !==
    'granted'
  ) {
    console.log(
      'Notification permission denied.'
    )

    return null
  }

  const projectId =
    Constants
      .expoConfig
      ?.extra
      ?.eas
      ?.projectId ??
    Constants
      .easConfig
      ?.projectId

  if (!projectId) {
    console.warn(
      'EAS projectId is missing.'
    )

    return null
  }

  const tokenResult =
    await Notifications
      .getExpoPushTokenAsync({
        projectId,
      })

  const expoPushToken =
    tokenResult.data

  console.log(
    'EXPO PUSH TOKEN:',
    expoPushToken
  )

  const {
    error,
  } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id:
          userId,

        expo_push_token:
          expoPushToken,

        platform:
          Platform.OS,

        device_name:
          Device.deviceName ??
          null,

        updated_at:
          new Date()
            .toISOString(),
      },
      {
        onConflict:
          'user_id,expo_push_token',
      }
    )

  if (error) {
    console.error(
      'SAVE PUSH TOKEN ERROR:',
      error
    )

    return null
  }

  return expoPushToken
}