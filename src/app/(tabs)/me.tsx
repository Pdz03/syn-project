import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'

import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { checkForAppUpdate } from '@/lib/app-updates'
import {
  getActiveSurveyLink,
  openSurveyLink,
  type SurveyLink,
} from '@/lib/survey-links'

export default function MeScreen() {
  const { profile, user } = useAuth()
  const [surveyLink, setSurveyLink] =
    useState<SurveyLink | null>(null)
  const [shareModalVisible, setShareModalVisible] =
    useState(false)

  useEffect(() => {
    getActiveSurveyLink().then(setSurveyLink)
  }, [])

  function handleShareSynId() {
    const synId = profile?.syn_id

    if (!synId) {
      Alert.alert('Syn ID unavailable', 'Syn ID kamu belum siap.')
      return
    }

    setShareModalVisible(true)
  }

  async function handleCopySynId() {
    if (!profile?.syn_id) return

    await Clipboard.setStringAsync(profile.syn_id)
    Alert.alert('Copied', 'Syn ID berhasil disalin.')
  }

  function handleNativeShare() {
    const synId = profile?.syn_id

    if (!synId) return

    Share.share({
      message: [
        'Add me on Syn',
        '',
        `Name: ${profile?.display_name ?? 'Syn User'}`,
        `Syn ID: ${synId}`,
        '',
        'Open Syn, tap Add Syn, then search my Syn ID.',
      ].join('\n'),
    }).catch((error) => {
      console.warn('SHARE SYN ID:', error)
    })
  }

  async function handleLogout() {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            const { error } =
              await supabase.auth.signOut()

            if (error) {
              console.error(
                'LOGOUT ERROR:',
                error
              )

              Alert.alert(
                'Error',
                error.message
              )
            }
          },
        },
      ]
    )
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
      }}
    >
      {/* Header */}

      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: Colors.ink,
          }}
        >
          Me
        </Text>
      </View>

      <View
        style={{
          padding: 20,
        }}
      >
        {/* Profile Card */}

        <View
          style={{
            padding: 20,
            borderRadius: 22,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#FFF1EB',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="person"
              size={34}
              color={Colors.primary}
            />
          </View>

          <Text
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: '800',
              color: Colors.ink,
            }}
          >
            {profile?.display_name || 'Syn User'}
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: Colors.secondary,
            }}
          >
            @{profile?.username || 'username'}
          </Text>

          <Text
            style={{
              marginTop: 12,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              color: Colors.muted,
            }}
          >
            {profile?.syn_id}
          </Text>

          {profile?.status_text && (
            <Text
              style={{
                marginTop: 14,
                color: Colors.muted,
              }}
            >
              {profile.status_text}
            </Text>
          )}
        </View>

        {/* Menu */}

        <View
          style={{
            marginTop: 18,
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <MenuItem
            icon="people-outline"
            title="Syn Requests"
            onPress={() =>
              router.push('/syn-requests')
            }
          />

          <MenuItem
            icon="share-social-outline"
            title="Share my Syn ID"
            onPress={handleShareSynId}
          />

          <MenuItem
            icon="settings-outline"
            title="Settings"
            subtitle="Coming soon"
            disabled
          />

          {surveyLink && (
            <MenuItem
              icon="chatbox-ellipses-outline"
              title={surveyLink.title}
              onPress={() =>
                openSurveyLink(surveyLink)
              }
            />
          )}

          <MenuItem
            icon="cloud-download-outline"
            title="Check for updates"
            onPress={() =>
              checkForAppUpdate({
                userId: user?.id,
              })
            }
          />
        </View>

        {/* Logout */}

        <Pressable
          onPress={handleLogout}
          style={{
            marginTop: 18,
            paddingVertical: 15,
            borderRadius: 14,
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Text
            style={{
              color: '#D64545',
              fontWeight: '700',
            }}
          >
            Log out
          </Text>
        </Pressable>
        </View>

        <Modal
          visible={shareModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(23,24,28,0.35)',
            }}
          >
            <View
              style={{
                padding: 22,
                paddingBottom: 34,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                backgroundColor: Colors.background,
              }}
            >
              <View
                style={{
                  alignSelf: 'center',
                  width: 40,
                  height: 4,
                  marginBottom: 22,
                  borderRadius: 2,
                  backgroundColor: Colors.border,
                }}
              />

              <Text
                style={{
                  color: Colors.ink,
                  fontSize: 22,
                  fontWeight: '800',
                }}
              >
                Share my Syn ID
              </Text>

              <View
                style={{
                  marginTop: 18,
                  padding: 22,
                  borderRadius: 18,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    color: Colors.muted,
                    fontSize: 12,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}
                >
                  Your Syn ID
                </Text>

                <Text
                  style={{
                    marginTop: 10,
                    color: Colors.secondary,
                    fontSize: 28,
                    fontWeight: '800',
                    letterSpacing: 1.2,
                  }}
                >
                  {profile?.syn_id}
                </Text>

                <Text
                  style={{
                    marginTop: 12,
                    color: Colors.muted,
                    lineHeight: 20,
                  }}
                >
                  Share your Syn ID with someone you know.
                </Text>
              </View>

              <Pressable
                onPress={handleCopySynId}
                style={{
                  marginTop: 14,
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: Colors.secondaryTint,
                }}
              >
                <Text
                  style={{
                    color: Colors.secondary,
                    fontWeight: '700',
                  }}
                >
                  Copy Syn ID
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShareModalVisible(false)
                  handleNativeShare()
                }}
                style={{
                  marginTop: 10,
                  paddingVertical: 15,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: Colors.primary,
                }}
              >
                <Text
                  style={{
                    color: Colors.surface,
                    fontWeight: '700',
                  }}
                >
                  Share
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShareModalVisible(false)}
                style={{
                  marginTop: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: Colors.muted,
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
  )
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={22}
        color={Colors.primary}
      />

      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: Colors.ink,
          }}
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              color: Colors.muted,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {!disabled && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.muted}
        />
      )}
    </Pressable>
  )
}
