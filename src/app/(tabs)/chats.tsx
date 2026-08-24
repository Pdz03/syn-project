import { useCallback, useState } from 'react'

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { router, useFocusEffect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynAvatar, SynBadge, SynEmptyState } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

type ChatItem = {
  conversation_id: string
  other_user_id: string
  display_name: string | null
  username: string | null
  syn_id: string
  avatar_url: string | null
  last_message: string | null
  last_message_type: string | null
  last_message_at: string | null
  last_message_sender_id?: string | null
  last_receipt_status?: 'sent' | 'delivered' | 'read' | null
  unread_count: number
}

export default function ChatsScreen() {
  const { user } = useAuth()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadChats() {
    try {
      const { data, error } = await supabase.rpc('get_my_chats_with_receipts')

      if (!error) {
        setChats((data ?? []) as ChatItem[])
        return
      }

      console.warn('GET CHATS WITH RECEIPTS FALLBACK:', error.message)

      const { data: fallbackData, error: fallbackError } =
        await supabase.rpc('get_my_chats')

      if (fallbackError) {
        console.error('GET CHATS:', fallbackError)
        return
      }

      setChats((fallbackData ?? []) as ChatItem[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadChats()

      const channelName = `chats-list:${Date.now()}`

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            console.log('CHATS REALTIME:', payload.new)
            markDelivered(payload.new as {
              conversation_id?: string
              sender_id?: string | null
            })
            loadChats()
          }
        )
        .subscribe((status, error) => {
          console.log('CHATS REALTIME STATUS:', status)

          if (error) {
            console.error('CHATS REALTIME ERROR:', error)
          }
        })

      return () => {
        supabase.removeChannel(channel).catch((error) => {
          console.error('REMOVE CHATS CHANNEL:', error)
        })
      }
    }, [user?.id])
  )

  function openChat(item: ChatItem) {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: item.conversation_id,
        userId: item.other_user_id,
        displayName: item.display_name ?? item.username ?? 'Syn User',
      },
    })
  }

  async function markDelivered(message: {
    conversation_id?: string
    sender_id?: string | null
  }) {
    if (!message.conversation_id || message.sender_id === user?.id) {
      return
    }

    const { error } = await supabase.rpc('mark_conversation_delivered', {
      target_conversation_id: message.conversation_id,
    })

    if (error) {
      console.warn('MARK DELIVERED:', error.message)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>chats</Text>

        <View style={styles.headerAction}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.muted}
          />
        </View>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.conversation_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={() => {
              setRefreshing(true)
              loadChats()
            }}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <SynEmptyState
            icon="chatbubble-outline"
            title="No chats yet"
            body="Add a Syn and start a conversation."
          />
        }
        renderItem={({ item }) => {
          const unread = item.unread_count > 0
          const name = item.display_name ?? item.username ?? 'Syn User'

          return (
            <Pressable
              onPress={() => openChat(item)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
            >
              <SynAvatar
                name={name}
                uri={item.avatar_url}
                size={48}
              />

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.name,
                      unread && styles.nameUnread,
                    ]}
                  >
                    {name}
                  </Text>

                  {item.last_message_at && (
                    <Text
                      style={[
                        styles.time,
                        unread && styles.timeUnread,
                      ]}
                    >
                      {formatTime(item.last_message_at)}
                    </Text>
                  )}
                </View>

                <View style={styles.rowBottom}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.message,
                      unread && styles.messageUnread,
                    ]}
                  >
                    {item.last_message ?? 'Start a conversation'}
                  </Text>

                  {item.last_message_sender_id === user?.id && (
                    <LastMessageStatus status={item.last_receipt_status} />
                  )}

                  {unread && (
                    <SynBadge
                      label={item.unread_count > 99 ? '99+' : item.unread_count}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

function LastMessageStatus({
  status,
}: {
  status?: ChatItem['last_receipt_status']
}) {
  return (
    <Ionicons
      name={status === 'delivered' || status === 'read' ? 'checkmark-done' : 'checkmark'}
      size={14}
      color={status === 'read' ? Colors.primary : Colors.muted}
    />
  )
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
  })
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: SynSpacing.gutter,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: SynSpacing.gutter,
    paddingVertical: 13,
    marginBottom: 1,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.65,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    flex: 1,
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  nameUnread: {
    fontWeight: '800',
  },
  time: {
    marginLeft: 8,
    color: Colors.muted,
    fontSize: 11,
  },
  timeUnread: {
    color: Colors.primary,
    fontWeight: '700',
  },
  rowBottom: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    flex: 1,
    color: Colors.muted,
    fontSize: 13,
  },
  messageUnread: {
    color: Colors.ink,
    fontWeight: '700',
  },
})
