import { useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { SynAvatar, SynCard, SynEmptyState } from '@/components/syn-ui'
import { Colors, SynSpacing } from '@/constants/colors'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  syn_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  status_text: string | null
  bio: string | null
}

export default function SynProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    loadProfile()
  }, [id])

  async function loadProfile() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, syn_id, username, display_name, avatar_url, status_text, bio')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('LOAD PROFILE:', error)
        return
      }

      setProfile(data)
    } finally {
      setLoading(false)
    }
  }

  const name = profile?.display_name ?? profile?.username ?? 'Syn User'

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={Colors.ink}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : profile ? (
        <View style={styles.content}>
          <SynCard style={styles.card}>
            <SynAvatar
              name={name}
              uri={profile.avatar_url}
              size={76}
            />

            <Text style={styles.name}>{name}</Text>

            {profile.username && (
              <Text style={styles.username}>@{profile.username}</Text>
            )}

            <Text style={styles.synId}>{profile.syn_id}</Text>

            {profile.status_text && (
              <Text style={styles.status}>{profile.status_text}</Text>
            )}

            {profile.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}
          </SynCard>
        </View>
      ) : (
        <SynEmptyState
          icon="person-circle-outline"
          title="Profile unavailable"
          body="This Syn profile could not be loaded."
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: SynSpacing.lg,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SynSpacing.lg,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  name: {
    marginTop: 16,
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  username: {
    marginTop: 4,
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  synId: {
    marginTop: 14,
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  status: {
    marginTop: 16,
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  bio: {
    marginTop: 10,
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
})
