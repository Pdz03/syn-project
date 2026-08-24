import { useEffect, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import * as Notifications from 'expo-notifications'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'

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
  receiptStatus?: 'sent' | 'delivered' | 'read'
}

type ReceiptPayload = {
  message_id: string
  user_id: string
  delivered_at: string | null
  read_at: string | null
}

type ChatProfile = {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

type Reaction = {
  message_id: string
  user_id: string
  emoji: string
}

const REACTION_OPTIONS = ['👍', '❤️', '😂', '🔥', '😮']

export default function ChatScreen() {
  const { id, userId, displayName } = useLocalSearchParams<{
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
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [chatProfile, setChatProfile] = useState<ChatProfile | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [reactions, setReactions] = useState<Reaction[]>([])

  useEffect(() => {
    if (!id) return

    loadMessages()
    loadChatProfile()
    markAsRead()
    clearChatNotifications()

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
            clearChatNotifications()
          }

          if (newMessage.type === 'image') {
            loadImageUrl(newMessage)
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

            return [
              ...current,
              {
                ...newMessage,
                receiptStatus:
                  newMessage.sender_id === user?.id ? 'sent' : undefined,
              },
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_receipts',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const receipt = payload.new as ReceiptPayload

          if (receipt.user_id === user?.id) {
            return
          }

          setMessages((current) =>
            current.map((message) =>
              message.id === receipt.message_id &&
              message.sender_id === user?.id
                ? {
                    ...message,
                    receiptStatus: getReceiptStatus(receipt),
                  }
                : message
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const nextReaction = payload.new as Reaction | null
          const oldReaction = payload.old as Reaction | null

          setReactions((current) => {
            if (payload.eventType === 'DELETE' && oldReaction) {
              return current.filter(
                (reaction) =>
                  !(
                    reaction.message_id === oldReaction.message_id &&
                    reaction.user_id === oldReaction.user_id
                  )
              )
            }

            if (!nextReaction) {
              return current
            }

            const withoutCurrent = current.filter(
              (reaction) =>
                !(
                  reaction.message_id === nextReaction.message_id &&
                  reaction.user_id === nextReaction.user_id
                )
            )

            return [...withoutCurrent, nextReaction]
          })
        }
      )
      .subscribe((status, error) => {
        console.log('REALTIME STATUS:', status)

        if (error) {
          console.error('REALTIME ERROR:', error)
        }
      })

    const notificationSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data

        if (data?.conversationId !== id) {
          return
        }

        loadMessages(false)
        markAsRead()
        clearChatNotifications()
      })

    return () => {
      console.log('REMOVE CHANNEL:', channelName)
      notificationSubscription.remove()

      supabase.removeChannel(channel).catch((error) => {
        console.error('REMOVE CHANNEL ERROR:', error)
      })
    }
  }, [id, user?.id, userId])

  async function loadChatProfile() {
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (!error) {
        setChatProfile(data)
      }

      return
    }

    const { data: member, error: memberError } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', id)
      .neq('user_id', user?.id)
      .limit(1)
      .maybeSingle()

    if (memberError || !member?.user_id) {
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('id', member.user_id)
      .maybeSingle()

    if (!error) {
      setChatProfile(data)
    }
  }

  async function loadMessages(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_conversation_messages',
        {
          target_conversation_id: id,
        }
      )

      if (!rpcError) {
        const nextMessages = ((rpcData ?? []) as Array<
          Message & { receipt_status?: string }
        >).map((message) => ({
          ...message,
          receiptStatus: toReceiptStatus(message.receipt_status),
        }))

        setMessages(
          nextMessages
        )
        loadImageUrls(nextMessages)
        loadReactions(nextMessages)
        return
      }

      console.warn('GET CONVERSATION MESSAGES FALLBACK:', rpcError.message)

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

      const nextMessages = (data ?? []) as Message[]
      setMessages(nextMessages)
      loadImageUrls(nextMessages)
      loadReactions(nextMessages)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
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
          receiptStatus: 'sent',
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
          item.id === localId
            ? { ...item, localStatus: 'sent', receiptStatus: 'sent' }
            : item
        )
      )
    } finally {
      setSending(false)
    }
  }

  async function handlePickImage() {
    if (!id || !user?.id || uploadingMedia) {
      return
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Gallery access', 'Izinkan akses galeri untuk mengirim foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.82,
    })

    if (result.canceled || !result.assets[0]) {
      return
    }

    await sendImageAsset(result.assets[0])
  }

  async function handleTakePhoto() {
    if (!id || !user?.id || uploadingMedia) {
      return
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Camera access', 'Izinkan akses kamera untuk mengambil foto.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.82,
    })

    if (result.canceled || !result.assets[0]) {
      return
    }

    await sendImageAsset(result.assets[0])
  }

  async function sendImageAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!id || !user?.id) {
      return
    }

    const localId = `local-image-${Date.now()}`
    const mediaPath = buildMediaPath(id, user.id, asset.uri)

    try {
      setUploadingMedia(true)
      setImageUrls((current) => ({
        ...current,
        [localId]: asset.uri,
      }))
      setMessages((current) => [
        ...current,
        {
          id: localId,
          conversation_id: id,
          sender_id: user.id,
          type: 'image',
          content: mediaPath,
          created_at: new Date().toISOString(),
          localStatus: 'pending',
          receiptStatus: 'sent',
        },
      ])

      const response = await fetch(asset.uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(mediaPath, blob, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const { error } = await supabase.rpc('send_image_message', {
        target_conversation_id: id,
        media_path: mediaPath,
      })

      if (error) {
        throw error
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === localId
            ? { ...message, localStatus: 'sent', receiptStatus: 'sent' }
            : message
        )
      )
    } catch (error) {
      console.error('SEND IMAGE:', error)
      setMessages((current) => current.filter((message) => message.id !== localId))
      setImageUrls((current) => {
        const next = { ...current }
        delete next[localId]
        return next
      })
      Alert.alert('Upload failed', 'Gagal mengirim foto. Coba lagi.')
    } finally {
      setUploadingMedia(false)
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

  function openProfile() {
    const profileId = chatProfile?.id ?? userId

    if (!profileId) {
      return
    }

    router.push({
      pathname: '/profile/[id]',
      params: {
        id: profileId,
      },
    })
  }

  function openMessageActions(message: Message) {
    if (message.id.startsWith('local-')) {
      return
    }

    const reactionButtons = REACTION_OPTIONS.map((emoji) => ({
      text: emoji,
      onPress: () => toggleReaction(message.id, emoji),
    }))

    Alert.alert('Message', undefined, [
      ...reactionButtons,
      ...(message.type === 'text' && message.content
        ? [
            {
              text: 'Copy',
              onPress: () => {
                Clipboard.setStringAsync(message.content ?? '').catch((error) => {
                  console.warn('COPY MESSAGE:', error)
                })
              },
            },
          ]
        : []),
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ])
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const { error } = await supabase.rpc('toggle_message_reaction', {
      target_message_id: messageId,
      reaction_emoji: emoji,
    })

    if (error) {
      console.warn('TOGGLE REACTION:', error.message)
      Alert.alert('Reaction failed', 'Belum bisa menambahkan reaction.')
    }
  }

  async function loadImageUrls(nextMessages: Message[]) {
    nextMessages
      .filter((message) => message.type === 'image' && message.content)
      .forEach((message) => {
        loadImageUrl(message)
      })
  }

  async function loadImageUrl(message: Message) {
    if (!message.content) {
      return
    }

    const { data, error } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(message.content, 60 * 60)

    if (error || !data?.signedUrl) {
      console.warn('IMAGE URL:', error?.message)
      return
    }

    setImageUrls((current) => ({
      ...current,
      [message.id]: data.signedUrl,
    }))
  }

  async function loadReactions(nextMessages: Message[]) {
    const messageIds = nextMessages
      .filter((message) => !message.id.startsWith('local-'))
      .map((message) => message.id)

    if (!messageIds.length) {
      setReactions([])
      return
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds)

    if (error) {
      console.warn('LOAD REACTIONS:', error.message)
      return
    }

    setReactions((data ?? []) as Reaction[])
  }

  function clearChatNotifications() {
    Notifications.getPresentedNotificationsAsync()
      .then((notifications) => {
        notifications.forEach((notification) => {
          const data = notification.request.content.data

          if (data?.conversationId !== id) {
            return
          }

          Notifications.dismissNotificationAsync(
            notification.request.identifier
          ).catch((error) => {
            console.warn('DISMISS NOTIFICATION:', error)
          })
        })
      })
      .catch((error) => {
        console.warn('GET NOTIFICATIONS:', error)
      })
  }

  const chatName =
    chatProfile?.display_name ??
    chatProfile?.username ??
    displayName ??
    'Syn'

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

        <Pressable onPress={openProfile}>
          <SynAvatar
            name={chatName}
            uri={chatProfile?.avatar_url}
            size={38}
          />
        </Pressable>

        <Pressable
          onPress={openProfile}
          style={styles.headerText}
        >
          <Text
            numberOfLines={1}
            style={styles.headerTitle}
          >
            {chatName}
          </Text>
          <Text style={styles.headerSubtitle}>Syn</Text>
        </Pressable>

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

            const imageUrl = imageUrls[item.id]
            const itemReactions = getReactionSummary(
              reactions.filter((reaction) => reaction.message_id === item.id)
            )

            return (
              <>
                {showDate && <DateSeparator dateValue={item.created_at} />}

                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                  ]}
                >
                  <Pressable
                    onLongPress={() => openMessageActions(item)}
                  >
                    {item.type === 'image' ? (
                      imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.messageImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <ActivityIndicator
                            size="small"
                            color={mine ? '#FFFFFF' : Colors.primary}
                          />
                        </View>
                      )
                    ) : (
                      <Text
                        style={[
                          styles.bubbleText,
                          mine ? styles.bubbleTextMine : styles.bubbleTextOther,
                        ]}
                      >
                        {item.content}
                      </Text>
                    )}
                  </Pressable>

                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaText,
                        mine ? styles.metaTextMine : styles.metaTextOther,
                      ]}
                    >
                      {formatMessageTime(item.created_at)}
                    </Text>
                    {mine && (
                      <MessageStatus
                        localStatus={item.localStatus}
                        receiptStatus={item.receiptStatus}
                      />
                    )}
                  </View>

                  {itemReactions.length > 0 && (
                    <View
                      style={[
                        styles.reactionRow,
                        mine ? styles.reactionRowMine : styles.reactionRowOther,
                      ]}
                    >
                      {itemReactions.map((reaction) => (
                        <View
                          key={reaction.emoji}
                          style={styles.reactionChip}
                        >
                          <Text style={styles.reactionText}>
                            {reaction.emoji}
                            {reaction.count > 1 ? ` ${reaction.count}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )
          }}
        />
      )}

      <View style={styles.composer}>
        <Pressable
          accessibilityRole="button"
          onPress={handlePickImage}
          disabled={uploadingMedia}
          style={[
            styles.mediaButton,
            uploadingMedia && styles.sendButtonDisabled,
          ]}
        >
          {uploadingMedia ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={20}
              color={Colors.primary}
            />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleTakePhoto}
          disabled={uploadingMedia}
          style={[
            styles.mediaButton,
            uploadingMedia && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons
            name="camera-outline"
            size={20}
            color={Colors.primary}
          />
        </Pressable>

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
          disabled={sending || uploadingMedia || !text.trim()}
          style={[
            styles.sendButton,
            (sending || uploadingMedia || !text.trim()) && styles.sendButtonDisabled,
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

function MessageStatus({
  localStatus,
  receiptStatus,
}: {
  localStatus?: Message['localStatus']
  receiptStatus?: Message['receiptStatus']
}) {
  const pending = localStatus === 'pending'
  const read = receiptStatus === 'read'

  return (
    <View style={read && styles.metaReadStatus}>
      <Ionicons
        name={
          pending
            ? 'time-outline'
            : receiptStatus === 'delivered' || read
              ? 'checkmark-done'
              : 'checkmark'
        }
        size={12}
        color={read ? Colors.primary : '#FFFFFF'}
        style={styles.metaStatus}
      />
    </View>
  )
}

function getReceiptStatus(
  receipt: ReceiptPayload
): NonNullable<Message['receiptStatus']> {
  if (receipt.read_at) return 'read'
  if (receipt.delivered_at) return 'delivered'

  return 'sent'
}

function toReceiptStatus(value?: string): Message['receiptStatus'] {
  if (value === 'read' || value === 'delivered' || value === 'sent') {
    return value
  }

  return undefined
}

function buildMediaPath(conversationId: string, userId: string, uri: string) {
  const extension = uri.split('.').pop()?.split('?')[0] ?? 'jpg'

  return `${conversationId}/${userId}/${Date.now()}.${extension}`
}

function getReactionSummary(nextReactions: Reaction[]) {
  return REACTION_OPTIONS.map((emoji) => ({
    emoji,
    count: nextReactions.filter((reaction) => reaction.emoji === emoji).length,
  })).filter((reaction) => reaction.count > 0)
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
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  imagePlaceholder: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
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
  metaReadStatus: {
    width: 16,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  reactionRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionRowMine: {
    justifyContent: 'flex-end',
  },
  reactionRowOther: {
    justifyContent: 'flex-start',
  },
  reactionChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  reactionText: {
    color: Colors.ink,
    fontSize: 12,
    fontWeight: '700',
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
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
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
