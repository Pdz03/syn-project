import { useCallback, useEffect, useState } from 'react'

import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'

import {
  supabase,
} from '@/lib/supabase'

import {
  useAuth,
} from '@/providers/auth-provider'

import {
  Colors,
  SynSpacing,
} from '@/constants/colors'
import { SynCard } from '@/components/syn-ui'
import {
  getActiveSurveyLink,
  openSurveyLink,
  type SurveyLink,
} from '@/lib/survey-links'
import { getSynRequestCount } from '@/lib/notification-counts'

export default function UpdatesScreen() {
  const { profile } =
    useAuth()
  const [surveyLink, setSurveyLink] =
    useState<SurveyLink | null>(null)
  const [synRequestCount, setSynRequestCount] = useState(0)

  useEffect(() => {
    getActiveSurveyLink().then(setSurveyLink)
  }, [])

  useFocusEffect(
    useCallback(() => {
      getSynRequestCount(profile?.id).then(setSynRequestCount)
    }, [profile?.id])
  )

  async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('LOGOUT ERROR:', error)
  }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent:
          'center',

        alignItems: 'center',

        backgroundColor:
          Colors.background,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/syn-requests')}
        style={styles.bellButton}
      >
        <Ionicons
          name={synRequestCount > 0 ? 'notifications' : 'notifications-outline'}
          size={21}
          color={Colors.primary}
        />
        {synRequestCount > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>
              {synRequestCount > 99 ? '99+' : synRequestCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Image
        source={require('@/assets/images/syn/syn_brand.png')}
        resizeMode="contain"
        style={{
          width: 132,
          height: 84,
        }}
      />

      <Text
        style={{
          marginTop: 16,
          color: Colors.ink,
        }}
      >
        Welcome,
        {' '}
        {profile?.display_name}
      </Text>

      <Text
        style={{
          marginTop: 8,
          color:
            Colors.secondary,
        }}
      >
        {profile?.syn_id}
      </Text>

      <SynCard style={styles.directoryCard}>
        <Text style={styles.directoryTitle}>Find early Syn users</Text>
        <Text style={styles.directoryBody}>
          See people joining the first Syn survey and send a Syn request.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/survey-directory' as never)}
          style={styles.directoryButton}
        >
          <Text style={styles.directoryButtonText}>Open directory</Text>
        </Pressable>
      </SynCard>

      {surveyLink && (
        <SynCard style={styles.feedbackCard}>
          <Text style={styles.directoryTitle}>{surveyLink.title}</Text>
          <Text style={styles.directoryBody}>
            Share feedback from your first Syn test.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => openSurveyLink(surveyLink)}
            style={styles.feedbackButton}
          >
            <Text style={styles.feedbackButtonText}>Open survey</Text>
          </Pressable>
        </SynCard>
      )}

      <Pressable
        onPress={handleLogout}
        style={{
          marginTop: 32,
        }}
      >
        <Text
          style={{
            color: Colors.muted,
          }}
        >
          Logout
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'absolute',
    top: 56,
    right: 22,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  directoryCard: {
    width: '86%',
    marginTop: 28,
    padding: SynSpacing.lg,
  },
  feedbackCard: {
    width: '86%',
    marginTop: 12,
    padding: SynSpacing.lg,
  },
  directoryTitle: {
    color: Colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  directoryBody: {
    marginTop: 8,
    color: Colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  directoryButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  directoryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  feedbackButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})
