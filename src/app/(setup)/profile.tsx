import { useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import { router } from 'expo-router'

import {
  supabase,
} from '@/lib/supabase'

import {
  useAuth,
} from '@/providers/auth-provider'

import {
  Colors,
} from '@/constants/colors'

export default function SetupProfileScreen() {
  const {
    user,
    refreshProfile,
  } = useAuth()

  const [
    displayName,
    setDisplayName,
  ] = useState('')

  const [
    username,
    setUsername,
  ] = useState('')

  const [
    statusText,
    setStatusText,
  ] = useState('')

  const [
    bio,
    setBio,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  async function handleSaveProfile() {
    if (!user) {
      Alert.alert(
        'Error',
        'Session tidak ditemukan.'
      )

      return
    }

    const cleanDisplayName =
      displayName.trim()

    const cleanUsername =
      username
        .trim()
        .toLowerCase()
        .replace(/^@/, '')

    if (!cleanDisplayName) {
      Alert.alert(
        'Nama belum diisi',
        'Masukkan display name.'
      )

      return
    }

    if (
      !/^[a-z0-9._]{3,30}$/.test(
        cleanUsername
      )
    ) {
      Alert.alert(
        'Username tidak valid',
        'Gunakan 3–30 karakter: huruf kecil, angka, titik, atau underscore.'
      )

      return
    }

    try {
      setLoading(true)

      const {
        data: existing,
        error: checkError,
      } =
        await supabase
          .from('profiles')
          .select('id')
          .ilike(
            'username',
            cleanUsername
          )
          .neq('id', user.id)
          .maybeSingle()

      if (checkError) {
        console.error(
          'USERNAME CHECK:',
          checkError
        )

        Alert.alert(
          'Error',
          'Gagal memeriksa username.'
        )

        return
      }

      if (existing) {
        Alert.alert(
          'Username sudah digunakan',
          `@${cleanUsername} sudah dipakai.`
        )

        return
      }

      const { error } =
        await supabase
          .from('profiles')
          .update({
            display_name:
              cleanDisplayName,

            username:
              cleanUsername,

            status_text:
              statusText.trim() ||
              null,

            bio:
              bio.trim() ||
              null,
          })
          .eq('id', user.id)

      if (error) {
        console.error(
          'PROFILE UPDATE:',
          error
        )

        if (
          error.code === '23505'
        ) {
          Alert.alert(
            'Username sudah digunakan',
            'Pilih username lain.'
          )

          return
        }

        Alert.alert(
          'Gagal menyimpan profil',
          error.message
        )

        return
      }

      await refreshProfile()

      router.replace(
        '/(setup)/welcome'
      )
    } catch (error) {
      console.error(error)

      Alert.alert(
        'Error',
        'Terjadi kesalahan.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          'center',

        padding: 24,

        backgroundColor:
          Colors.background,
      }}
    >
      <Text
        style={{
          fontSize: 40,
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
          fontSize: 26,
          fontWeight: '700',
          color: Colors.ink,
        }}
      >
        Set up your profile
      </Text>

      <Text
        style={{
          marginTop: 8,
          marginBottom: 28,
          color: Colors.muted,
        }}
      >
        This is how your Syns
        will recognize you.
      </Text>

      <TextInput
        placeholder="Display name"
        value={displayName}
        onChangeText={
          setDisplayName
        }
        maxLength={60}
        style={inputStyle}
      />

      <TextInput
        placeholder="@username"
        value={username}
        onChangeText={
          setUsername
        }
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        style={inputStyle}
      />

      <TextInput
        placeholder=
          "Status (optional)"
        value={statusText}
        onChangeText={
          setStatusText
        }
        maxLength={120}
        style={inputStyle}
      />

      <TextInput
        placeholder=
          "Bio (optional)"
        value={bio}
        onChangeText={setBio}
        maxLength={240}
        multiline
        style={[
          inputStyle,
          {
            minHeight: 90,
            textAlignVertical:
              'top',
          },
        ]}
      />

      <Pressable
        onPress={
          handleSaveProfile
        }
        disabled={loading}
        style={{
          marginTop: 12,
          paddingVertical: 16,
          alignItems: 'center',
          borderRadius: 14,
          backgroundColor:
            Colors.primary,

          opacity:
            loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: '#fff',
              fontWeight: '700',
            }}
          >
            Continue
          </Text>
        )}
      </Pressable>
    </View>
  )
}

const inputStyle = {
  backgroundColor:
    Colors.surface,

  borderWidth: 1,

  borderColor:
    Colors.border,

  borderRadius: 14,

  paddingHorizontal: 16,

  paddingVertical: 14,

  marginBottom: 12,

  color: Colors.ink,
}