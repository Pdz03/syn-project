import { useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { router } from 'expo-router'

import {
  SynAvatar,
  SynButton,
  SynEmptyState,
  SynHeader,
} from '@/components/syn-ui'
import { Colors, SynSpacing } from '@/constants/colors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

type DirectoryProfile = {
  id: string
  syn_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  status_text: string | null
}

export default function SurveyDirectoryScreen() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    loadProfiles()
  }, [user?.id])

  async function loadProfiles() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, syn_id, username, display_name, avatar_url, status_text')
        .eq('survey_visible', true)
        .neq('id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('SURVEY DIRECTORY:', error)
        Alert.alert('Unable to load users', 'Gagal memuat daftar user.')
        return
      }

      setProfiles((data ?? []) as DirectoryProfile[])
    } finally {
      setLoading(false)
    }
  }

  async function sendRequest(profile: DirectoryProfile) {
    try {
      setSendingId(profile.id)

      const { error } = await supabase.rpc('send_syn_request', {
        target_user_id: profile.id,
      })

      if (error) {
        Alert.alert('Unable to add Syn', error.message)
        return
      }

      setProfiles((current) =>
        current.filter((item) => item.id !== profile.id)
      )
      Alert.alert('Request sent', 'Syn request sent.')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <View style={styles.screen}>
      <SynHeader
        title="Early Syn users"
        subtitle="Find people joining the first survey"
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            profiles.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <SynEmptyState
              icon="people-outline"
              title="No users yet"
              body="Early survey users will show up here."
            />
          }
          renderItem={({ item }) => {
            const name = item.display_name ?? item.username ?? 'Syn User'

            return (
              <View style={styles.card}>
                <SynAvatar
                  name={name}
                  uri={item.avatar_url}
                  size={52}
                />

                <View style={styles.body}>
                  <Text
                    numberOfLines={1}
                    style={styles.name}
                  >
                    {name}
                  </Text>
                  {item.username && (
                    <Text style={styles.username}>@{item.username}</Text>
                  )}
                  <Text style={styles.synId}>{item.syn_id}</Text>
                  {item.status_text && (
                    <Text
                      numberOfLines={2}
                      style={styles.status}
                    >
                      {item.status_text}
                    </Text>
                  )}
                </View>

                <SynButton
                  title="Add"
                  loading={sendingId === item.id}
                  onPress={() => sendRequest(item)}
                  style={styles.button}
                  textStyle={styles.buttonText}
                />
              </View>
            )
          }}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: SynSpacing.lg,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  username: {
    marginTop: 3,
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  synId: {
    marginTop: 4,
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  status: {
    marginTop: 7,
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 13,
  },
})
