import { useState } from 'react'

import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { router } from 'expo-router'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynAvatar, SynButton, SynCard } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export default function WelcomeScreen() {
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleEnterSyn() {
    if (!profile) return

    try {
      setLoading(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
        })
        .eq('id', profile.id)

      if (error) {
        console.error('ONBOARDING ERROR:', error)
        Alert.alert('Error', 'Gagal menyelesaikan onboarding.')
        return
      }

      await refreshProfile()
      router.replace('/(tabs)')
    } finally {
      setLoading(false)
    }
  }

  const displayName = profile?.display_name ?? 'Syn User'

  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <SynAvatar
          name={displayName}
          uri={profile?.avatar_url}
          size={80}
        />

        <Text style={styles.kicker}>welcome to syn,</Text>
        <Text style={styles.title}>{displayName}</Text>

        <SynCard style={styles.idCard}>
          <Text style={styles.idLabel}>your syn id</Text>
          <Text style={styles.synId}>{profile?.syn_id}</Text>
          <Text style={styles.idBody}>
            this is your permanent identity on syn. share it to connect with people you know.
          </Text>

          <View style={styles.cardDivider} />

          <Text style={styles.cardHint}>
            add your syns using their id or syn code. no public followers, no strangers.
          </Text>
        </SynCard>
      </View>

      <View style={styles.footer}>
        <SynButton
          title="go to syn"
          loading={loading}
          onPress={handleEnterSyn}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SynSpacing.xxl,
  },
  kicker: {
    marginTop: 16,
    color: Colors.muted,
    fontSize: 14,
  },
  title: {
    marginTop: 4,
    marginBottom: 30,
    color: Colors.ink,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
  idCard: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 22,
  },
  idLabel: {
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  synId: {
    marginTop: 8,
    color: Colors.secondary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  idBody: {
    marginTop: 10,
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 21,
  },
  cardDivider: {
    height: 1,
    marginTop: 16,
    marginBottom: 14,
    backgroundColor: Colors.border,
  },
  cardHint: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: SynSpacing.xxl,
    paddingBottom: 36,
  },
})
