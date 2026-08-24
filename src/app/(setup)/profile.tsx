import { useState } from 'react'

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { router } from 'expo-router'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynAvatar, SynButton, SynInput } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export default function SetupProfileScreen() {
  const { user, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [statusText, setStatusText] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSaveProfile() {
    if (!user) {
      Alert.alert('Error', 'Session tidak ditemukan.')
      return
    }

    const cleanDisplayName = displayName.trim()
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '')

    if (!cleanDisplayName) {
      Alert.alert('Nama belum diisi', 'Masukkan display name.')
      return
    }

    if (!/^[a-z0-9._]{3,30}$/.test(cleanUsername)) {
      Alert.alert(
        'Username tidak valid',
        'Gunakan 3-30 karakter: huruf kecil, angka, titik, atau underscore.'
      )
      return
    }

    try {
      setLoading(true)

      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle()

      if (checkError) {
        console.error('USERNAME CHECK:', checkError)
        Alert.alert('Error', 'Gagal memeriksa username.')
        return
      }

      if (existing) {
        Alert.alert('Username sudah digunakan', `@${cleanUsername} sudah dipakai.`)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: cleanDisplayName,
          username: cleanUsername,
          status_text: statusText.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (error) {
        console.error('PROFILE UPDATE:', error)

        if (error.code === '23505') {
          Alert.alert('Username sudah digunakan', 'Pilih username lain.')
          return
        }

        Alert.alert('Gagal menyimpan profil', error.message)
        return
      }

      await refreshProfile()
      router.replace('/(setup)/welcome')
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandRow}>
        <Text style={styles.logo}>syn</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View>
          <Text style={styles.title}>set up your profile</Text>
          <Text style={styles.subtitle}>this is how your syns will see you</Text>
        </View>

        <View style={styles.avatarRow}>
          <SynAvatar
            name={displayName || username || '?'}
            size={72}
          />
          <View style={styles.avatarTextWrap}>
            <Text style={styles.avatarTitle}>add a photo later</Text>
            <Text style={styles.avatarSubtitle}>
              for now, your initial keeps things simple
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <SynInput
            label="full name"
            leftIcon="person-outline"
            placeholder="Fendi Pratama"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
            textContentType="name"
          />

          <SynInput
            label="username"
            leftIcon="at-outline"
            placeholder="fendi"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />

          <SynInput
            label="status"
            leftIcon="chatbubble-ellipses-outline"
            placeholder="what are you up to?"
            value={statusText}
            onChangeText={setStatusText}
            maxLength={120}
          />

          <SynInput
            label="bio"
            leftIcon="reader-outline"
            placeholder="a short note about you"
            value={bio}
            onChangeText={setBio}
            maxLength={240}
            multiline
            style={styles.bioInput}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SynButton
          title="create profile"
          loading={loading}
          onPress={handleSaveProfile}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  brandRow: {
    paddingTop: 58,
    paddingHorizontal: SynSpacing.gutter,
  },
  logo: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  content: {
    paddingHorizontal: SynSpacing.xxl,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 24,
  },
  title: {
    color: Colors.ink,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 6,
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarTextWrap: {
    flex: 1,
  },
  avatarTitle: {
    color: Colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  avatarSubtitle: {
    marginTop: 4,
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    gap: 14,
  },
  bioInput: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: SynSpacing.xxl,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
  },
})
