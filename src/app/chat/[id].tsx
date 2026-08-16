import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useEffect, useRef, useState } from "react";

import { Colors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  type: "text" | "image" | "nudge" | "system";
  content: string | null;
  created_at: string;
};

export default function ChatScreen() {
  const { id, displayName } = useLocalSearchParams<{
    id: string;
    userId?: string;
    displayName?: string;
  }>();

  const listRef = useRef<FlatList<Message>>(null);

  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);

  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;

    loadMessages();
    markAsRead();

    const channelName = `chat:${id}:${Date.now()}`;

    console.log("SUBSCRIBE CHANNEL:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          console.log("REALTIME MESSAGE:", payload.new);

          const newMessage = payload.new as Message;

          if (newMessage.sender_id !== user?.id) {
            markAsRead();
          }

          setMessages((current) => {
            const alreadyExists = current.some(
              (message) => message.id === newMessage.id,
            );

            if (alreadyExists) {
              return current;
            }

            return [...current, newMessage];
          });
        },
      )
      .subscribe((status, error) => {
        console.log("REALTIME STATUS:", status);

        if (error) {
          console.error("REALTIME ERROR:", error);
        }
      });

    return () => {
      console.log("REMOVE CHANNEL:", channelName);

      supabase.removeChannel(channel).catch((error) => {
        console.error("REMOVE CHANNEL ERROR:", error);
      });
    };
  }, [id]);

  async function loadMessages() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          conversation_id,
          sender_id,
          type,
          content,
          created_at
        `,
        )
        .eq("conversation_id", id)
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.error("LOAD MESSAGES:", error);

        return;
      }

      setMessages((data ?? []) as Message[]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const message = text.trim();

    if (!message || !id || sending) {
      return;
    }

    try {
      setSending(true);

      setText("");

      const { error } = await supabase.rpc("send_message", {
        target_conversation_id: id,

        message_content: message,

        reply_message_id: null,
      });

      if (error) {
        console.error("SEND MESSAGE:", error);

        // Restore text
        setText(message);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleNudge() {
    if (!id) return;

    try {
      const { error } = await supabase.rpc("send_nudge", {
        target_conversation_id: id,
      });

      if (error) {
        console.error("NUDGE ERROR:", error);

        const message = error.message.toLowerCase();

        if (
          message.includes("rate") ||
          message.includes("limit") ||
          message.includes("nudge")
        ) {
          Alert.alert(
            "Easy there 👋",
            "Terlalu banyak Nudge. Coba lagi sebentar.",
          );
        } else {
          Alert.alert("Nudge failed", error.message);
        }

        return;
      }
    } catch (error) {
      console.error("NUDGE CATCH:", error);
    }
  }

  async function markAsRead() {
    if (!id) return;

    const { error } = await supabase.rpc("mark_conversation_read", {
      target_conversation_id: id,
    });

    if (error) {
      console.error("MARK READ:", error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: Colors.background,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}

      <View
        style={{
          paddingTop: 54,
          paddingHorizontal: 16,
          paddingBottom: 14,

          flexDirection: "row",
          alignItems: "center",

          backgroundColor: Colors.surface,

          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.ink} />
        </Pressable>

        <View
          style={{
            marginLeft: 14,
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: Colors.ink,
            }}
          >
            {displayName ?? "Syn"}
          </Text>

          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              color: Colors.muted,
            }}
          >
            Syn
          </Text>
        </View>

        <Pressable
          onPress={handleNudge}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,

            justifyContent: "center",

            alignItems: "center",

            backgroundColor: "#FFF1EB",

            transform: [
              {
                scale: pressed ? 0.9 : 1,
              },
            ],
          })}
        >
          <Text
            style={{
              fontSize: 19,
            }}
          >
            👋
          </Text>
        </Pressable>
      </View>

      {/* Messages */}

      {loading ? (
        <View
          style={{
            flex: 1,

            justifyContent: "center",

            alignItems: "center",
          }}
        >
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({
              animated: true,
            });
          }}
          onLayout={() => {
            listRef.current?.scrollToEnd({
              animated: false,
            });
          }}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 20,
          }}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;

            if (item.type === "nudge") {
              return (
                <View
                  style={{
                    alignItems: "center",
                    marginVertical: 12,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: "#FFF1EB",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.primary,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {mine ? "You sent a Nudge 👋" : "You got a Nudge 👋"}
                    </Text>
                  </View>
                </View>
              );
            }

            return (
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",

                  maxWidth: "78%",

                  marginBottom: 8,

                  paddingHorizontal: 14,

                  paddingVertical: 10,

                  borderRadius: 18,

                  backgroundColor: mine ? Colors.primary : Colors.surface,

                  borderWidth: mine ? 0 : 1,

                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    color: mine ? "#FFFFFF" : Colors.ink,

                    fontSize: 15,
                  }}
                >
                  {item.content}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Composer */}

      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 18,

          flexDirection: "row",
          alignItems: "flex-end",

          backgroundColor: Colors.surface,

          borderTopWidth: 1,
          borderTopColor: Colors.border,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          multiline
          style={{
            flex: 1,

            maxHeight: 110,

            paddingHorizontal: 16,
            paddingVertical: 11,

            borderRadius: 22,

            backgroundColor: Colors.background,

            color: Colors.ink,
          }}
        />

        <Pressable
          onPress={handleSend}
          disabled={sending || !text.trim()}
          style={{
            width: 44,
            height: 44,

            marginLeft: 8,

            borderRadius: 22,

            justifyContent: "center",

            alignItems: "center",

            backgroundColor: Colors.primary,

            opacity: sending || !text.trim() ? 0.45 : 1,
          }}
        >
          <Ionicons name="send" size={19} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
