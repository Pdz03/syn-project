import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { useAuth } from '@/providers/auth-provider'

type RelationshipState =
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'syns'
  | 'blocked'
  | 'self'

type SearchResult = {
  id: string
  syn_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  status_text: string | null
  bio: string | null
  relationship_state: RelationshipState
}

export default function AddSynScreen() {
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
  const cleanQuery = query.trim()

  if (cleanQuery.length < 3) {
    Alert.alert(
      'Search',
      'Masukkan minimal 3 karakter.'
    )
    return
  }

  try {
    console.log('SEARCH START:', cleanQuery)

    setLoading(true)
    setResults([])
    setSearched(false)

    const {
      data,
      error,
    } = await supabase.rpc(
      'search_syn_users',
      {
        search_query: cleanQuery,
      }
    )

    console.log(
      'SEARCH RESULT:',
      data,
      error
    )

    if (error) {
      console.error(
        'SEARCH SYN ERROR:',
        error
      )

      Alert.alert(
        'Search error',
        error.message
      )

      return
    }

    setResults(
      (data ?? []) as SearchResult[]
    )

    setSearched(true)

  } catch (error) {
    console.error(
      'SEARCH SYN CATCH:',
      error
    )

    Alert.alert(
      'Error',
      'Terjadi kesalahan saat mencari Syn.'
    )

  } finally {
    setLoading(false)
  }
}

async function handleMessage(target: SearchResult) {
  try {
    const { data, error } = await supabase.rpc(
      'get_or_create_direct_conversation',
      {
        target_user_id: target.id,
      }
    )

    if (error) {
      console.error('CREATE CONVERSATION ERROR:', error)

      Alert.alert(
        'Unable to open chat',
        error.message
      )

      return
    }

    router.push({
      pathname: '/chat/[id]',
      params: {
        id: data,
        userId: target.id,
        displayName:
          target.display_name ??
          target.username ??
          'Syn User',
      },
    })

  } catch (error) {
    console.error(
      'OPEN CHAT ERROR:',
      error
    )

    Alert.alert(
      'Error',
      'Gagal membuka percakapan.'
    )
  }
}

  async function handleAddSyn(
    target: SearchResult
  ) {
    if (
      target.relationship_state !== 'none'
    ) {
      return
    }

    try {
      setSendingId(target.id)

      const {
        data,
        error,
      } = await supabase.rpc(
        'send_syn_request',
        {
          target_user_id: target.id,
        }
      )

      if (error) {
        console.error(
          'SEND SYN REQUEST ERROR:',
          error
        )

        Alert.alert(
          'Unable to add Syn',
          error.message
        )

        return
      }

      console.log(
        'SYN REQUEST CREATED:',
        data
      )

      setResults((current) =>
        current.map((item) =>
          item.id === target.id
            ? {
                ...item,
                relationship_state:
                  'outgoing_pending',
              }
            : item
        )
      )

      Alert.alert(
        'Request sent',
        `Syn request sent to ${
          target.display_name ||
          `@${target.username}`
        }.`
      )

    } catch (error) {
      console.error(
        'ADD SYN CATCH:',
        error
      )

      Alert.alert(
        'Error',
        'Terjadi kesalahan saat mengirim Syn request.'
      )

    } finally {
      setSendingId(null)
    }
  }

  function getButtonLabel(
    state: RelationshipState
  ) {
    switch (state) {
      case 'outgoing_pending':
        return 'Request Sent'

      case 'incoming_pending':
        return 'Respond'

      case 'syns':
        return 'Message'

      case 'blocked':
        return 'Unavailable'

      case 'self':
        return 'You'

      default:
        return 'Add Syn'
    }
  }

  function getButtonStyle(
    state: RelationshipState
  ) {
    const active =
      state === 'none'

    return {
      backgroundColor:
        active
          ? Colors.primary
          : Colors.border,
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
      {/* Header */}

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
          Add Syn
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
        }}
      >
        {/* Search */}

        <Text
          style={{
            fontSize: 14,
            color: Colors.muted,
            marginBottom: 10,
          }}
        >
          Search by username or Syn ID
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,

              flexDirection: 'row',
              alignItems: 'center',

              borderWidth: 1,
              borderColor:
                Colors.border,

              borderRadius: 14,

              backgroundColor:
                Colors.surface,

              paddingHorizontal: 14,
            }}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={Colors.muted}
            />

            <TextInput
              value={query}
              onChangeText={setQuery}

              placeholder="@username, fendi, SYN482, 4821..."

              autoCapitalize="none"
              autoCorrect={false}

              returnKeyType="search"

              onSubmitEditing={
                handleSearch
              }

              style={{
                flex: 1,

                paddingHorizontal: 10,
                paddingVertical: 14,

                color: Colors.ink,
              }}
            />
          </View>

          <Pressable
            onPress={handleSearch}
            disabled={loading}
            style={{
              width: 52,

              borderRadius: 14,

              backgroundColor:
                Colors.primary,

              justifyContent:
                'center',

              alignItems: 'center',

              opacity:
                loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="search"
                size={22}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>

        {/* Search hints */}

        <Text
          style={{
            marginTop: 10,

            fontSize: 12,
            color: Colors.muted,
          }}
        >
          Try at least 3 characters.
        </Text>

        {/* Results */}

        {results.length > 0 && (
          <View
            style={{
              marginTop: 28,
            }}
          >
            <Text
              style={{
                marginBottom: 12,

                fontSize: 14,
                fontWeight: '600',

                color: Colors.muted,
              }}
            >
              Search results
            </Text>

            {results.map((result) => {
              const isSending =
                sendingId === result.id

              const canAdd =
                result.relationship_state ===
                'none'

              return (
                <View
                  key={result.id}
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
                    {/* Avatar */}

                    <View
                      style={{
                        width: 54,
                        height: 54,

                        borderRadius: 27,

                        backgroundColor:
                          '#FFF1EB',

                        justifyContent:
                          'center',

                        alignItems:
                          'center',

                        marginRight: 14,
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

                    {/* User information */}

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 17,

                          fontWeight:
                            '700',

                          color:
                            Colors.ink,
                        }}
                      >
                        {result.display_name ||
                          'Syn User'}
                      </Text>

                      {result.username && (
                        <Text
                          style={{
                            marginTop: 3,

                            color:
                              Colors.secondary,
                          }}
                        >
                          @{result.username}
                        </Text>
                      )}

                      <Text
                        style={{
                          marginTop: 5,

                          fontSize: 12,

                          letterSpacing: 1,

                          fontWeight:
                            '600',

                          color:
                            Colors.muted,
                        }}
                      >
                        {result.syn_id}
                      </Text>
                    </View>
                  </View>

                  {result.status_text && (
                    <Text
                      style={{
                        marginTop: 14,

                        color:
                          Colors.muted,

                        lineHeight: 20,
                      }}
                    >
                      {result.status_text}
                    </Text>
                  )}

                  {/* Action */}

                  <Pressable
                    onPress={() => {
  if (
    result.relationship_state ===
    'none'
  ) {
    handleAddSyn(result)
    return
  }

  if (
    result.relationship_state ===
    'syns'
  ) {
    handleMessage(result)
    return
  }

  if (
    result.relationship_state ===
    'incoming_pending'
  ) {
    router.push('/syn-requests')
  }
}}
                    disabled={
  isSending ||
  result.relationship_state ===
    'outgoing_pending' ||
  result.relationship_state ===
    'blocked'
}
                    style={{
                      marginTop: 18,

                      paddingVertical: 13,

                      borderRadius: 14,

                      alignItems:
                        'center',

                      opacity:
                        isSending
                          ? 0.6
                          : 1,

                      ...getButtonStyle(
                        result.relationship_state
                      ),
                    }}
                  >
                    {isSending ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={{
                          fontWeight:
                            '700',

                          color:
                            canAdd
                              ? '#FFFFFF'
                              : Colors.muted,
                        }}
                      >
                        {getButtonLabel(
                          result.relationship_state
                        )}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )
            })}
          </View>
        )}

        {/* No results */}

        {searched &&
          results.length === 0 &&
          !loading && (
            <View
              style={{
                marginTop: 50,

                alignItems:
                  'center',
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,

                  borderRadius: 36,

                  justifyContent:
                    'center',

                  alignItems:
                    'center',

                  backgroundColor:
                    Colors.surface,
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={32}
                  color={
                    Colors.muted
                  }
                />
              </View>

              <Text
                style={{
                  marginTop: 16,

                  fontSize: 16,

                  fontWeight:
                    '600',

                  color:
                    Colors.ink,
                }}
              >
                No Syn found
              </Text>

              <Text
                style={{
                  marginTop: 6,

                  textAlign:
                    'center',

                  color:
                    Colors.muted,
                }}
              >
                Try another username
                or Syn ID.
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  )
}