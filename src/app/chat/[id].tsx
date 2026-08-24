import { useEffect, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { Colors, SynSpacing } from '@/constants/colors'
import { SynAvatar, SynEmptyState } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  type: 'text' | 'image' | 'nudge' | 'system'
  content: string | null
  created_at: string
  localStatus?: 'pending' | 'sent'
}

export default function ChatScreen() {
  const { id, displayName } = useLocalSearchParams<{
    id: string
    userId?: string
    displayName?: string
  }>()

  const listRef = useRef<FlatList<Message>>(null)
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return

    loadMessages()
    markAsRead()

    const channelName = `chat:${id}:${Date.now()}`

    console.log('SUBSCRIBE CHANNEL:', channelName)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          console.log('REALTIME MESSAGE:', payload.new)

          const newMessage = payload.new as Message

          if (newMessage.sender_id !== user?.id) {
            markAsRead()
          }

          setMessages((current) => {
            const alreadyExists = current.some(
              (message) => message.id === newMessage.id
            )

            if (alreadyExists) {
              return current
            }

            const pendingIndex = current.findIndex(
              (message) =>
                message.id.startsWith('local-') &&
                message.sender_id === newMessage.sender_id &&
                message.content === newMessage.content
            )

            if (pendingIndex >= 0) {
              return current.map((message, index) =>
                index === pendingIndex
                  ? { ...newMessage, localStatus: 'sent' }
                  : message
              )
            }

            return [...current, newMessage]
          })
        }
      )
      .subscribe((status, error) => {
        console.log('REALTIME STATUS:', status)

        if (error) {
          console.error('REALTIME ERROR:', error)
        }
      })

    return () => {
      console.log('REMOVE CHANNEL:', channelName)

      supabase.removeChannel(channel).catch((error) => {
        console.error('REMOVE CHANNEL ERROR:', error)
      })
    }
  }, [id])

  async function loadMessages() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          conversation_id,
          sender_id,
          type,
          content,
          created_at
        `
        )
        .eq('conversation_id', id)
        .order('created_at', {
          ascending: true,
        })

      if (error) {
        console.error('LOAD MESSAGES:', error)
        return
      }

      setMessages((data ?? []) as Message[])
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const message = text.trim()

    if (!message || !id || sending) {
      return
    }

    const localId = `local-${Date.now()}`

    try {
      setSending(true)
      setText('')
      setMessages((current) => [
        ...current,
        {
          id: localId,
          conversation_id: id,
          sender_id: user?.id ?? null,
          type: 'text',
          content: message,
          created_at: new Date().toISOString(),
          localStatus: 'pending',
        },
      ])

      const { error } = await supabase.rpc('send_message', {
        target_conversation_id: id,
        message_content: message,
        reply_message_id: null,
      })

      if (error) {
        console.error('SEND MESSAGE:', error)
        setMessages((current) => current.filter((item) => item.id !== localId))
        setText(message)
        return
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === localId ? { ...item, localStatus: 'sent' } : item
        )
      )
    } finally {
      setSending(false)
    }
  }

  async function handleNudge() {
    if (!id) return

    try {
      const { error } = await supabase.rpc('send_nudge', {
        target_conversation_id: id,
      })

      if (error) {
        console.error('NUDGE ERROR:', error)

        const message = error.message.toLowerCase()

        if (
          message.includes('rate') ||
          message.includes('limit') ||
          message.includes('nudge')
        ) {
          Alert.alert('Easy there', 'Terlalu banyak Nudge. Coba lagi sebentar.')
        } else {
          Alert.alert('Nudge failed', error.message)
        }

        return
      }
    } catch (error) {
      console.error('NUDGE CATCH:', error)
    }
  }

  async function markAsRead() {
    if (!id) return

    const { error } = await supabase.rpc('mark_conversation_read', {
      target_conversation_id: id,
    })

    if (error) {
      console.error('MARK READ:', error)
    }
  }

  const chatName = displayName ?? 'Syn'

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
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

        <SynAvatar
          name={chatName}
          size={38}
        />

        <View style={styles.headerText}>
          <Text
            numberOfLines={1}
            style={styles.headerTitle}
          >
            {chatName}
          </Text>
          <Text style={styles.headerSubtitle}>Syn</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleNudge}
          style={({ pressed }) => [
            styles.nudgeButton,
            pressed && styles.nudgePressed,
          ]}
        >
          <Ionicons
            name="hand-left-outline"
            size={20}
            color={Colors.primary}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({
              animated: true,
            })
          }}
          onLayout={() => {
            listRef.current?.scrollToEnd({
              animated: false,
            })
          }}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <SynEmptyState
              icon="chatbubble-outline"
              title="No messages yet"
              body="Send a message or a Nudge to start."
            />
          }
          renderItem={({ item, index }) => {
            const mine = item.sender_id === user?.id
            const previous = messages[index - 1]
            const showDate = !previous || !isSameDay(previous.created_at, item.created_at)

            if (item.type === 'nudge') {
              return (
                <>
                  {showDate && <DateSeparator dateValue={item.created_at} />}

                  <View style={styles.nudgeRow}>
                    <View style={styles.nudgePill}>
                      <Ionicons
                        name="hand-left-outline"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.nudgeText}>
                        {mine ? 'You sent a Nudge' : 'You got a Nudge'}
                      </Text>
                      <Text style={styles.nudgeTime}>{formatMessageTime(item.created_at)}</Text>
                    </View>
                  </View>
                </>
              )
            }

            return (
              <>
                {showDate && <DateSeparator dateValue={item.created_at} />}

                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      mine ? styles.bubbleTextMine : styles.bubbleTextOther,
                    ]}
                  >
                    {item.content}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaText,
                        mine ? styles.metaTextMine : styles.metaTextOther,
                      ]}
                    >
                      {formatMessageTime(item.created_at)}
                    </Text>
                    {mine && <MessageStatus status={item.localStatus} />}
                  </View>
                </View>
              </>
            )
          }}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={Colors.muted}
          multiline
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          onPress={handleSend}
          disabled={sending || !text.trim()}
          style={[
            styles.sendButton,
            (sending || !text.trim()) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function DateSeparator({ dateValue }: { dateValue: string }) {
  return (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateSeparatorText}>{formatDateLabel(dateValue)}</Text>
    </View>
  )
}

function MessageStatus({ status }: { status?: Message['localStatus'] }) {
  return (
    <Ionicons
      name={status === 'pending' ? 'time-outline' : 'checkmark'}
      size={12}
      color="#FFFFFF"
      style={styles.metaStatus}
    />
  )
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function formatMessageTime(dateValue: string) {
  return new Date(dateValue).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
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
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    color: Colors.muted,
    fontSize: 12,
  },
  nudgeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  nudgePressed: {
    transform: [{ scale: 0.94 }],
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: SynSpacing.lg,
    paddingVertical: SynSpacing.lg,
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  nudgeRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  nudgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.primaryTint,
  },
  nudgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  nudgeTime: {
    color: Colors.primary,
    fontSize: 11,
    opacity: 0.72,
  },
  dateSeparator: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  dateSeparatorText: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: Colors.surface,
  },
  bubble: {
    maxWidth: '78%',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
    backgroundColor: Colors.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: Colors.ink,
  },
  metaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
  },
  metaTextMine: {
    color: '#FFFFFF',
    opacity: 0.78,
  },
  metaTextOther: {
    color: Colors.muted,
  },
  metaStatus: {
    opacity: 0.9,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    color: Colors.ink,
    backgroundColor: Colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
