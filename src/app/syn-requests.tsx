import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/providers/auth-provider'

type SynRequestItem = {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
  sender: {
    id: string
    syn_id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
    status_text: string | null
  } | null
}

export default function SynRequestsScreen() {
  const { user } = useAuth()

  const [requests, setRequests] = useState<SynRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('syn_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'LOAD SYN REQUESTS:',
          error
        )

        Alert.alert(
          'Error',
          'Gagal mengambil Syn Requests.'
        )

        return
      }

      const rows = data ?? []

      const withProfiles = await Promise.all(
        rows.map(async (request) => {
          const {
            data: sender,
            error: profileError,
          } = await supabase
            .from('profiles')
            .select(`
              id,
              syn_id,
              username,
              display_name,
              avatar_url,
              status_text
            `)
            .eq('id', request.sender_id)
            .single()

          if (profileError) {
            console.error(
              'LOAD REQUEST PROFILE:',
              profileError
            )
          }

          return {
            ...request,
            sender: sender ?? null,
          }
        })
      )

      setRequests(withProfiles)

    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleAccept(
    requestId: string
  ) {
    try {
      setProcessingId(requestId)

      const { error } =
        await supabase.rpc(
          'accept_syn_request',
          {
            request_id: requestId,
          }
        )

      if (error) {
        console.error(
          'ACCEPT SYN REQUEST:',
          error
        )

        Alert.alert(
          'Error',
          error.message
        )

        return
      }

      setRequests((current) =>
        current.filter(
          (item) =>
            item.id !== requestId
        )
      )

      Alert.alert(
        'Connected',
        'You are now Syns.'
      )

    } finally {
      setProcessingId(null)
    }
  }

  async function handleDecline(
    requestId: string
  ) {
    try {
      setProcessingId(requestId)

      const { error } =
        await supabase.rpc(
          'decline_syn_request',
          {
            request_id: requestId,
          }
        )

      if (error) {
        console.error(
          'DECLINE SYN REQUEST:',
          error
        )

        Alert.alert(
          'Error',
          error.message
        )

        return
      }

      setRequests((current) =>
        current.filter(
          (item) =>
            item.id !== requestId
        )
      )

    } finally {
      setProcessingId(null)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          Colors.background,
      }}
    >
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,

          flexDirection: 'row',
          alignItems: 'center',

          backgroundColor:
            Colors.surface,

          borderBottomWidth: 1,
          borderBottomColor:
            Colors.border,
        }}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={{
            marginRight: 16,
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={Colors.ink}
          />
        </Pressable>

        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: Colors.ink,
          }}
        >
          Syn Requests
        </Text>
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent:
              'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator
            color={Colors.primary}
          />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                loadRequests()
              }}
            />
          }
          contentContainerStyle={{
            padding: 20,
            flexGrow: 1,
          }}
        >
          {requests.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent:
                  'center',
                alignItems:
                  'center',
              }}
            >
              <Ionicons
                name="people-outline"
                size={48}
                color={Colors.muted}
              />

              <Text
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: '700',
                  color: Colors.ink,
                }}
              >
                No Syn Requests
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  textAlign: 'center',
                  color:
                    Colors.muted,
                }}
              >
                New connection
                requests will appear
                here.
              </Text>
            </View>
          ) : (
            requests.map(
              (request) => {
                const sender =
                  request.sender

                const processing =
                  processingId ===
                  request.id

                return (
                  <View
                    key={request.id}
                    style={{
                      marginBottom: 12,
                      padding: 18,

                      borderRadius: 20,

                      backgroundColor:
                        Colors.surface,

                      borderWidth: 1,
                      borderColor:
                        Colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection:
                          'row',

                        alignItems:
                          'center',
                      }}
                    >
                      <View
                        style={{
                          width: 54,
                          height: 54,

                          borderRadius:
                            27,

                          marginRight:
                            14,

                          backgroundColor:
                            '#FFF1EB',

                          justifyContent:
                            'center',

                          alignItems:
                            'center',
                        }}
                      >
                        <Ionicons
                          name="person"
                          size={26}
                          color={
                            Colors.primary
                          }
                        />
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize:
                              17,

                            fontWeight:
                              '700',

                            color:
                              Colors.ink,
                          }}
                        >
                          {sender
                            ?.display_name ||
                            'Syn User'}
                        </Text>

                        {sender?.username && (
                          <Text
                            style={{
                              marginTop:
                                3,

                              color:
                                Colors.secondary,
                            }}
                          >
                            @
                            {
                              sender.username
                            }
                          </Text>
                        )}

                        <Text
                          style={{
                            marginTop:
                              5,

                            fontSize:
                              12,

                            fontWeight:
                              '600',

                            letterSpacing:
                              1,

                            color:
                              Colors.muted,
                          }}
                        >
                          {
                            sender?.syn_id
                          }
                        </Text>
                      </View>
                    </View>

                    {sender?.status_text && (
                      <Text
                        style={{
                          marginTop: 14,
                          color:
                            Colors.muted,
                        }}
                      >
                        {
                          sender.status_text
                        }
                      </Text>
                    )}

                    <View
                      style={{
                        marginTop: 18,
                        flexDirection:
                          'row',
                        gap: 10,
                      }}
                    >
                      <Pressable
                        disabled={
                          processing
                        }
                        onPress={() =>
                          handleDecline(
                            request.id
                          )
                        }
                        style={{
                          flex: 1,

                          paddingVertical:
                            13,

                          borderRadius:
                            14,

                          alignItems:
                            'center',

                          borderWidth: 1,

                          borderColor:
                            Colors.border,

                          backgroundColor:
                            Colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight:
                              '700',

                            color:
                              Colors.ink,
                          }}
                        >
                          Decline
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={
                          processing
                        }
                        onPress={() =>
                          handleAccept(
                            request.id
                          )
                        }
                        style={{
                          flex: 1,

                          paddingVertical:
                            13,

                          borderRadius:
                            14,

                          alignItems:
                            'center',

                          backgroundColor:
                            Colors.primary,
                        }}
                      >
                        {processing ? (
                          <ActivityIndicator
                            color="#fff"
                          />
                        ) : (
                          <Text
                            style={{
                              fontWeight:
                                '700',

                              color:
                                '#fff',
                            }}
                          >
                            Accept
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )
              }
            )
          )}
        </ScrollView>
      )}
    </View>
  )
}