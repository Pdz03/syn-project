import { Alert, Linking, Platform } from 'react-native'

import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

import { supabase } from '@/lib/supabase'

const INSTALL_ID_KEY = 'syn.install_id'

type UpdateResult = {
  update_available: boolean
  force_update: boolean
  latest_version: string | null
  download_url: string | null
  message: string | null
}

export async function checkForAppUpdate({
  userId,
  silent = false,
}: {
  userId?: string | null
  silent?: boolean
}) {
  const installId = await getInstallId()
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0'

  const { data, error } = await supabase.rpc('check_app_update', {
    p_install_id: installId,
    p_platform_name: Platform.OS,
    p_installed_version: currentVersion,
    p_current_user_id: userId ?? null,
  })

  if (error) {
    console.warn('CHECK UPDATE:', error.message)

    if (!silent) {
      Alert.alert('Update check failed', 'Gagal memeriksa update.')
    }

    return
  }

  const result = (data?.[0] ?? null) as UpdateResult | null

  if (!result?.update_available) {
    if (!silent) {
      Alert.alert('Syn is up to date', `Version ${currentVersion}`)
    }

    return
  }

  Alert.alert(
    result.force_update ? 'Update required' : 'Update available',
    result.message ?? `Syn ${result.latest_version} is available.`,
    [
      ...(!result.force_update
        ? [
            {
              text: 'Later',
              style: 'cancel' as const,
            },
          ]
        : []),
      {
        text: 'Download',
        onPress: () => {
          if (result.download_url) {
            Linking.openURL(result.download_url).catch((linkError) => {
              console.warn('OPEN UPDATE URL:', linkError)
            })
          }
        },
      },
    ]
  )
}

async function getInstallId() {
  const existingId = await AsyncStorage.getItem(INSTALL_ID_KEY)

  if (existingId) {
    return existingId
  }

  const nextId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  await AsyncStorage.setItem(INSTALL_ID_KEY, nextId)

  return nextId
}
