import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native'

import {
  router,
  useLocalSearchParams,
} from 'expo-router'

import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string
    access_token?: string
    refresh_token?: string
    error?: string
    error_description?: string
  }>()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      console.log(
        'AUTH CALLBACK PARAMS:',
        params
      )

      if (params.error) {
        console.error(
          'AUTH CALLBACK ERROR:',
          params.error,
          params.error_description
        )

        router.replace(
          '/(auth)/login'
        )

        return
      }

      /*
       * PKCE FLOW
       *
       * syn://auth/callback?code=xxxx
       */

      if (params.code) {
        const {
          data,
          error,
        } =
          await supabase.auth
            .exchangeCodeForSession(
              params.code
            )

        if (error) {
          console.error(
            'EXCHANGE CODE ERROR:',
            error
          )

          router.replace(
            '/(auth)/login'
          )

          return
        }

        console.log(
          'EMAIL VERIFIED:',
          data.user?.email
        )

        router.replace('/')

        return
      }

      /*
       * TOKEN FLOW
       *
       * fallback kalau callback
       * mengandung tokens.
       */

      if (
        params.access_token &&
        params.refresh_token
      ) {
        const {
          error,
        } =
          await supabase.auth
            .setSession({
              access_token:
                params.access_token,

              refresh_token:
                params.refresh_token,
            })

        if (error) {
          console.error(
            'SET SESSION ERROR:',
            error
          )

          router.replace(
            '/(auth)/login'
          )

          return
        }

        router.replace('/')

        return
      }

      /*
       * Kalau session ternyata
       * sudah terbentuk.
       */

      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession()

      if (session) {
        router.replace('/')
        return
      }

      console.warn(
        'No auth data found in callback.'
      )

      router.replace(
        '/(auth)/login'
      )

    } catch (error) {
      console.error(
        'AUTH CALLBACK CATCH:',
        error
      )

      router.replace(
        '/(auth)/login'
      )
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor:
          Colors.background,
      }}
    >
      <ActivityIndicator
        color={Colors.primary}
      />

      <Text
        style={{
          marginTop: 16,
          color: Colors.muted,
        }}
      >
        Verifying your account...
      </Text>
    </View>
  )
}