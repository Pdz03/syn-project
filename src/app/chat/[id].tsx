import { useEffect, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { SynAvatar, SynEmptyState, SynModal } from '@/components/syn-ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

type Message = {
  id: string
  conversation_id: string
  sender_id: string | null
  type: 'text' | 'image' | 'nudge' | 'system'
  content: string | null
  created_at: string
  edited_at?: string | null
  reply_message_id?: string | null
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

const BOTTOM_SCROLL_THRESHOLD = 96

export default function ChatScreen() {
  const { id, userId, displayName, unreadCount } = useLocalSearchParams<{
    id: string
    userId?: string
    displayName?: string
    unreadCount?: string
  }>()

  const listRef = useRef<FlatList<Message>>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialScrollReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialScrollDoneRef = useRef(false)
  const isNearBottomRef = useRef(true)
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [chatProfile, setChatProfile] = useState<ChatProfile | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<Message | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newRoomMessageCount, setNewRoomMessageCount] = useState(0)

  useEffect(() => {
    if (!id) return

    initialScrollDoneRef.current = false
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
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          console.log('REALTIME MESSAGE:', payload)

          if (payload.eventType === 'DELETE') {
            const oldMessage = payload.old as Message | null

            if (oldMessage?.id) {
              setMessages((current) =>
                current.filter((message) => message.id !== oldMessage.id)
              )
              setReactions((current) =>
                current.filter(
                  (reaction) => reaction.message_id !== oldMessage.id
                )
              )
            }

            return
          }

          const newMessage = payload.new as Message
          const shouldScrollToNewMessage =
            newMessage.sender_id === user?.id || isNearBottomRef.current

          if (payload.eventType === 'UPDATE') {
            setMessages((current) =>
              current.map((message) =>
                message.id === newMessage.id
                  ? {
                      ...message,
                      ...newMessage,
                    }
                  : message
              )
            )

            return
          }

          if (newMessage.sender_id !== user?.id) {
            markAsRead()
            clearChatNotifications()
          }

          if (newMessage.type === 'image') {
            loadImageUrl(newMessage)
          }

          if (!shouldScrollToNewMessage && newMessage.sender_id !== user?.id) {
            setNewRoomMessageCount((count) => count + 1)
            setShowScrollButton(true)
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

          if (shouldScrollToNewMessage) {
            setTimeout(() => scrollToLatest(), 80)
          }
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
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current)
      }
      if (initialScrollReadyTimerRef.current) {
        clearTimeout(initialScrollReadyTimerRef.current)
      }

      supabase.removeChannel(channel).catch((error) => {
        console.error('REMOVE CHANNEL ERROR:', error)
      })
    }
  }, [id, user?.id, userId])

  useEffect(() => {
    if (!loading && messages.length > 0 && !initialScrollDoneRef.current) {
      scrollToInitialTarget(false)
      initialScrollReadyTimerRef.current = setTimeout(() => {
        initialScrollDoneRef.current = true
      }, 250)
    }
  }, [loading, messages.length, unreadCount, user?.id])

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
          created_at,
          edited_at,
          reply_message_id
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

    if (editingMessage) {
      await editMessage(editingMessage, message)
      return
    }

    const localId = `local-${Date.now()}`

    try {
      setComposerError(null)
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
          reply_message_id: replyTo?.id ?? null,
        },
      ])
      scrollToLatest()

      const { error } = await supabase.rpc('send_message', {
        target_conversation_id: id,
        message_content: message,
        reply_message_id: replyTo?.id ?? null,
      })

      if (error) {
        console.error('SEND MESSAGE:', error)
        setComposerError('Message failed to send.')
        setMessages((current) => current.filter((item) => item.id !== localId))
        setText(message)
        return
      }

      setReplyTo(null)
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
    const contentType = getImageContentType(asset)
    const mediaPath = buildMediaPath(id, user.id, asset.uri, contentType)

    try {
      setComposerError(null)
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
      scrollToLatest()

      const response = await fetch(asset.uri)
      const body = await response.arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(mediaPath, body, {
          contentType,
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
      setComposerError('Photo failed to send.')
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

  function scrollToLatest(animated = true) {
    isNearBottomRef.current = true
    setShowScrollButton(false)
    setNewRoomMessageCount(0)

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated })
    })

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current)
    }

    scrollTimerRef.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated })
    }, 80)
  }

  function handleMessageListScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const {
      contentOffset,
      contentSize,
      layoutMeasurement,
    } = event.nativeEvent
    const distanceFromBottom =
      contentSize.height -
      layoutMeasurement.height -
      contentOffset.y
    const nearBottom =
      distanceFromBottom < BOTTOM_SCROLL_THRESHOLD

    isNearBottomRef.current = nearBottom
    setShowScrollButton(!nearBottom)

    if (nearBottom) {
      setNewRoomMessageCount(0)
    }
  }

  function scrollToInitialTarget(animated = false) {
    const targetIndex = getUnreadBoundaryIndex(
      messages,
      user?.id,
      parseUnreadCount(unreadCount)
    )

    if (targetIndex < 0) {
      scrollToLatest(animated)
      return
    }

    isNearBottomRef.current = false
    setShowScrollButton(true)

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: targetIndex,
        animated,
        viewPosition: 0.18,
      })
    })
  }

  function openMessageActions(message: Message) {
    if (message.id.startsWith('local-')) {
      return
    }

    setActionMessage(message)
  }

  function confirmDeleteMessage(message: Message) {
    Alert.alert('Delete for everyone?', 'This message will be removed from this chat for both of you.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete for everyone',
        style: 'destructive',
        onPress: () => deleteMessage(message),
      },
    ])
  }

  async function deleteMessage(message: Message) {
    if (message.sender_id !== user?.id) {
      return
    }

    const { error } = await supabase.rpc('delete_message', {
      target_message_id: message.id,
    })

    if (error) {
      console.warn('DELETE MESSAGE:', error.message)
      Alert.alert('Delete failed', 'Gagal menghapus pesan.')
      return
    }

    if (message.type === 'image' && message.content) {
      supabase.storage
        .from('chat-media')
        .remove([message.content])
        .then(({ error: removeError }) => {
          if (removeError) {
            console.warn('DELETE IMAGE:', removeError.message)
          }
        })
    }

    setMessages((current) =>
      current.map((currentMessage) =>
        currentMessage.id === message.id
          ? {
              ...currentMessage,
              type: 'system',
              content: 'This message was deleted',
              reply_message_id: null,
            }
          : currentMessage
      )
    )
    setReactions((current) =>
      current.filter((reaction) => reaction.message_id !== message.id)
    )

    if (replyTo?.id === message.id) {
      setReplyTo(null)
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const { error } = await supabase.rpc('toggle_message_reaction', {
      target_message_id: messageId,
      reaction_emoji: emoji,
    })

    if (error) {
      console.warn('TOGGLE REACTION:', error.message)
      Alert.alert('Reaction failed', 'Belum bisa menambahkan reaction.')
      return
    }

    setReactions((current) => {
      const existing = current.find(
        (reaction) =>
          reaction.message_id === messageId &&
          reaction.user_id === user?.id
      )

      const withoutMine = current.filter(
        (reaction) =>
          !(
            reaction.message_id === messageId &&
            reaction.user_id === user?.id
          )
      )

      if (existing?.emoji === emoji || !user?.id) {
        return withoutMine
      }

      return [
        ...withoutMine,
        {
          message_id: messageId,
          user_id: user.id,
          emoji,
        },
      ]
    })
  }

  function startEditMessage(message: Message) {
    setActionMessage(null)
    setReplyTo(null)
    setComposerError(null)
    setEditingMessage(message)
    setText(message.content ?? '')
  }

  function cancelEdit() {
    setEditingMessage(null)
    setText('')
  }

  async function editMessage(message: Message, nextContent: string) {
    try {
      setComposerError(null)
      setSending(true)

      const { error } = await supabase.rpc('edit_message', {
        target_message_id: message.id,
        new_content: nextContent,
      })

      if (error) {
        console.warn('EDIT MESSAGE:', error.message)
        setComposerError('Edit failed.')
        Alert.alert('Edit failed', 'Gagal mengubah pesan.')
        return
      }

      setMessages((current) =>
        current.map((currentMessage) =>
          currentMessage.id === message.id
            ? {
                ...currentMessage,
                content: nextContent,
                edited_at: new Date().toISOString(),
              }
            : currentMessage
        )
      )
      setEditingMessage(null)
      setText('')
    } finally {
      setSending(false)
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
  const initialUnreadCount = parseUnreadCount(unreadCount)
  const unreadBoundaryIndex = getUnreadBoundaryIndex(
    messages,
    user?.id,
    initialUnreadCount
  )
  const unreadBoundaryId =
    unreadBoundaryIndex >= 0 ? messages[unreadBoundaryIndex]?.id : null

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
            if (initialScrollDoneRef.current) {
              if (isNearBottomRef.current) {
                scrollToLatest()
              }
            } else {
              scrollToInitialTarget(false)
            }
          }}
          onLayout={() => {
            if (!initialScrollDoneRef.current) {
              scrollToInitialTarget(false)
            }
          }}
          initialScrollIndex={
            messages.length > 1
              ? unreadBoundaryIndex >= 0
                ? unreadBoundaryIndex
                : messages.length - 1
              : undefined
          }
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            })
            setTimeout(() => scrollToInitialTarget(false), 120)
          }}
          onScroll={handleMessageListScroll}
          scrollEventThrottle={80}
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
                  {unreadBoundaryId === item.id && (
                    <UnreadSeparator count={initialUnreadCount} />
                  )}

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

            if (isDeletedMessage(item)) {
              return (
                <>
                  {showDate && <DateSeparator dateValue={item.created_at} />}
                  {unreadBoundaryId === item.id && (
                    <UnreadSeparator count={initialUnreadCount} />
                  )}

                  <View style={styles.deletedRow}>
                    <Text style={styles.deletedText}>Message was deleted</Text>
                    <Text style={styles.deletedTime}>
                      {formatMessageTime(item.created_at)}
                    </Text>
                  </View>
                </>
              )
            }

            const imageUrl = imageUrls[item.id]
            const repliedMessage = item.reply_message_id
              ? messages.find((message) => message.id === item.reply_message_id)
              : undefined
            const itemReactions = getReactionSummary(
              reactions.filter((reaction) => reaction.message_id === item.id)
            )

            return (
              <>
                {showDate && <DateSeparator dateValue={item.created_at} />}
                {unreadBoundaryId === item.id && (
                  <UnreadSeparator count={initialUnreadCount} />
                )}

                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleOther,
                    itemReactions.length > 0 && styles.bubbleWithReactions,
                  ]}
                >
                  <Pressable
                    onPress={() => {
                      if (item.type === 'image' && imageUrl) {
                        setPreviewImageUrl(imageUrl)
                      }
                    }}
                    onLongPress={() => openMessageActions(item)}
                  >
                    {item.reply_message_id && (
                      <ReplyPreview
                        message={repliedMessage ?? null}
                        mine={mine}
                      />
                    )}

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
                      {item.edited_at ? ' · edited' : ''}
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

      {showScrollButton && (
        <Pressable
          accessibilityRole="button"
          onPress={() => scrollToLatest()}
          style={styles.scrollButton}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color="#FFFFFF"
          />
          {newRoomMessageCount > 0 && (
            <View style={styles.scrollBadge}>
              <Text style={styles.scrollBadgeText}>
                {newRoomMessageCount > 99 ? '99+' : newRoomMessageCount}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      <MessageActionSheet
        message={actionMessage}
        mine={actionMessage?.sender_id === user?.id}
        onClose={() => setActionMessage(null)}
        onReply={(message) => {
          setActionMessage(null)
          setEditingMessage(null)
          setReplyTo(message)
        }}
        onEdit={startEditMessage}
        onCopy={(message) => {
          setActionMessage(null)
          Clipboard.setStringAsync(message.content ?? '').catch((error) => {
            console.warn('COPY MESSAGE:', error)
          })
        }}
        onDelete={(message) => {
          setActionMessage(null)
          confirmDeleteMessage(message)
        }}
        onReact={(message, emoji) => {
          setActionMessage(null)
          toggleReaction(message.id, emoji)
        }}
      />

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      <View style={styles.composer}>
        {composerError && (
          <Text style={styles.composerError}>{composerError}</Text>
        )}

        {editingMessage && (
          <View style={styles.replyComposer}>
            <View style={styles.replyComposerText}>
              <Text style={styles.replyComposerLabel}>Editing message</Text>
              <Text
                numberOfLines={1}
                style={styles.replyComposerBody}
              >
                {editingMessage.content}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={cancelEdit}
              style={styles.replyClose}
            >
              <Ionicons
                name="close"
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>
        )}

        {replyTo && (
          <View style={styles.replyComposer}>
            <View style={styles.replyComposerText}>
              <Text style={styles.replyComposerLabel}>Replying to</Text>
              <Text
                numberOfLines={1}
                style={styles.replyComposerBody}
              >
                {getReplyText(replyTo)}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setReplyTo(null)}
              style={styles.replyClose}
            >
              <Ionicons
                name="close"
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>
        )}

        <View style={styles.composerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={handlePickImage}
          disabled={uploadingMedia || Boolean(editingMessage)}
          style={[
            styles.mediaButton,
            (uploadingMedia || editingMessage) && styles.sendButtonDisabled,
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
          disabled={uploadingMedia || Boolean(editingMessage)}
          style={[
            styles.mediaButton,
            (uploadingMedia || editingMessage) && styles.sendButtonDisabled,
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
      </View>
    </KeyboardAvoidingView>
  )
}

function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null
  onClose: () => void
}) {
  return (
    <Modal
      visible={Boolean(imageUrl)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.previewClose}
        >
          <Ionicons
            name="close"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            resizeMode="contain"
            style={styles.previewImage}
          />
        )}
      </View>
    </Modal>
  )
}

function DateSeparator({ dateValue }: { dateValue: string }) {
  return (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateSeparatorText}>{formatDateLabel(dateValue)}</Text>
    </View>
  )
}

function UnreadSeparator({ count }: { count: number }) {
  return (
    <View style={styles.unreadSeparator}>
      <View style={styles.unreadLine} />
      <Text style={styles.unreadText}>
        {count === 1 ? '1 unread message' : `${count} unread messages`}
      </Text>
      <View style={styles.unreadLine} />
    </View>
  )
}

function MessageActionSheet({
  message,
  mine,
  onClose,
  onReply,
  onEdit,
  onCopy,
  onDelete,
  onReact,
}: {
  message: Message | null
  mine: boolean
  onClose: () => void
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onCopy: (message: Message) => void
  onDelete: (message: Message) => void
  onReact: (message: Message, emoji: string) => void
}) {
  if (!message) {
    return null
  }

  return (
    <SynModal
      visible={Boolean(message)}
      onClose={onClose}
      title="Message"
    >
      <View style={styles.actionReactionRow}>
        {REACTION_OPTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            onPress={() => onReact(message, emoji)}
            style={styles.actionReaction}
          >
            <Text style={styles.actionReactionText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <ActionSheetItem
        icon="return-down-back-outline"
        label="Reply"
        onPress={() => onReply(message)}
      />

      {mine && message.type === 'text' && (
        <ActionSheetItem
          icon="create-outline"
          label="Edit"
          onPress={() => onEdit(message)}
        />
      )}

      {message.type === 'text' && message.content && (
        <ActionSheetItem
          icon="copy-outline"
          label="Copy"
          onPress={() => onCopy(message)}
        />
      )}

      {mine && (
        <ActionSheetItem
          icon="trash-outline"
          label="Delete for everyone"
          danger
          onPress={() => onDelete(message)}
        />
      )}

      <ActionSheetItem
        icon="close-outline"
        label="Cancel"
        onPress={onClose}
      />
    </SynModal>
  )
}

function ActionSheetItem({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  danger?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionItem,
        pressed && styles.actionPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? Colors.danger : Colors.primary}
      />
      <Text
        style={[
          styles.actionLabel,
          danger && styles.actionLabelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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

function ReplyPreview({
  message,
  mine,
}: {
  message: Message | null
  mine: boolean
}) {
  return (
    <View
      style={[
        styles.replyBubble,
        mine ? styles.replyBubbleMine : styles.replyBubbleOther,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.replyBubbleText,
          mine ? styles.replyBubbleTextMine : styles.replyBubbleTextOther,
        ]}
      >
        {message ? getReplyText(message) : 'Message'}
      </Text>
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

function buildMediaPath(
  conversationId: string,
  userId: string,
  uri: string,
  contentType: string
) {
  const extension =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : uri.split('.').pop()?.split('?')[0] ?? 'jpg'

  return `${conversationId}/${userId}/${Date.now()}.${extension}`
}

function getImageContentType(asset: ImagePicker.ImagePickerAsset) {
  if (
    asset.mimeType === 'image/jpeg' ||
    asset.mimeType === 'image/png' ||
    asset.mimeType === 'image/webp'
  ) {
    return asset.mimeType
  }

  const path = asset.uri.toLowerCase()

  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'

  return 'image/jpeg'
}

function getReactionSummary(nextReactions: Reaction[]) {
  return REACTION_OPTIONS.map((emoji) => ({
    emoji,
    count: nextReactions.filter((reaction) => reaction.emoji === emoji).length,
  })).filter((reaction) => reaction.count > 0)
}

function getReplyText(message: Message) {
  if (isDeletedMessage(message)) return 'Message was deleted'
  if (message.type === 'image') return 'Photo'
  if (message.type === 'nudge') return 'Nudge'

  return message.content ?? 'Message'
}

function isDeletedMessage(message: Message) {
  return message.type === 'system' && message.content === 'This message was deleted'
}

function parseUnreadCount(value?: string) {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function getUnreadBoundaryIndex(
  messages: Message[],
  currentUserId: string | undefined,
  unreadCount: number
) {
  if (!currentUserId || unreadCount <= 0) {
    return -1
  }

  let remaining = unreadCount

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.sender_id === currentUserId || message.id.startsWith('local-')) {
      continue
    }

    remaining -= 1

    if (remaining === 0) {
      return index
    }
  }

  return -1
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
  previewOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  previewClose: {
    position: 'absolute',
    top: 52,
    right: 18,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scrollButton: {
    position: 'absolute',
    right: 18,
    bottom: 92,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  scrollBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
  },
  scrollBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
  deletedRow: {
    alignSelf: 'center',
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedText: {
    color: Colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  deletedTime: {
    color: Colors.muted,
    fontSize: 10,
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
  unreadSeparator: {
    marginTop: 2,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unreadLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.primaryAlpha,
  },
  unreadText: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: Colors.primaryTint,
  },
  bubble: {
    maxWidth: '78%',
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    position: 'relative',
  },
  bubbleWithReactions: {
    marginBottom: 22,
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
  replyBubble: {
    marginBottom: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderLeftWidth: 3,
    borderRadius: 10,
  },
  replyBubbleMine: {
    borderLeftColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  replyBubbleOther: {
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  replyBubbleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyBubbleTextMine: {
    color: '#FFFFFF',
  },
  replyBubbleTextOther: {
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
    position: 'absolute',
    bottom: -16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionRowMine: {
    right: 8,
    justifyContent: 'flex-end',
  },
  reactionRowOther: {
    left: 8,
    justifyContent: 'flex-start',
  },
  reactionChip: {
    minHeight: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha,
    backgroundColor: Colors.surface,
    shadowColor: Colors.primaryShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },
  reactionText: {
    color: Colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  actionReactionRow: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionReaction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  actionReactionText: {
    fontSize: 22,
  },
  actionItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionPressed: {
    opacity: 0.65,
  },
  actionLabel: {
    color: Colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  actionLabelDanger: {
    color: Colors.danger,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyComposer: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
  },
  replyComposerText: {
    flex: 1,
    minWidth: 0,
  },
  replyComposerLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  replyComposerBody: {
    marginTop: 2,
    color: Colors.ink,
    fontSize: 13,
  },
  replyClose: {
    padding: 4,
  },
  composerError: {
    marginBottom: 8,
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '700',
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
