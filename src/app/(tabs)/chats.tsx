import { useCallback, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";

import { supabase } from "@/lib/supabase";

import { Colors } from "@/constants/colors";

type ChatItem = {
  conversation_id: string;

  other_user_id: string;

  display_name: string | null;

  username: string | null;

  syn_id: string;

  avatar_url: string | null;

  last_message: string | null;

  last_message_type: string | null;

  last_message_at: string | null;

  unread_count: number;
};

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  async function loadChats() {
    try {
      const { data, error } = await supabase.rpc("get_my_chats");

      if (error) {
        console.error("GET CHATS:", error);

        return;
      }

      setChats((data ?? []) as ChatItem[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadChats();

      const channelName = `chats-list:${Date.now()}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            console.log("CHATS REALTIME:", payload.new);

            // Untuk MVP kita reload list.
            // Nanti bisa dioptimalkan update local state.
            loadChats();
          },
        )
        .subscribe((status, error) => {
          console.log("CHATS REALTIME STATUS:", status);

          if (error) {
            console.error("CHATS REALTIME ERROR:", error);
          }
        });

      return () => {
        supabase.removeChannel(channel).catch((error) => {
          console.error("REMOVE CHATS CHANNEL:", error);
        });
      };
    }, []),
  );

  function openChat(item: ChatItem) {
    router.push({
      pathname: "/chat/[id]",

      params: {
        id: item.conversation_id,

        userId: item.other_user_id,

        displayName: item.display_name ?? item.username ?? "Syn User",
      },
    });
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,

          justifyContent: "center",

          alignItems: "center",

          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
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

          paddingBottom: 18,

          backgroundColor: Colors.surface,

          borderBottomWidth: 1,

          borderBottomColor: Colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 28,

            fontWeight: "800",

            color: Colors.ink,
          }}
        >
          Chats
        </Text>
      </View>

      {/* List */}

      <FlatList
        data={chats}
        keyExtractor={(item) => item.conversation_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);

              loadChats();
            }}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,

          paddingBottom: 100,
        }}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,

              justifyContent: "center",

              alignItems: "center",

              padding: 40,
            }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={48}
              color={Colors.muted}
            />

            <Text
              style={{
                marginTop: 16,

                fontSize: 18,

                fontWeight: "700",

                color: Colors.ink,
              }}
            >
              No chats yet
            </Text>

            <Text
              style={{
                marginTop: 7,

                textAlign: "center",

                lineHeight: 20,

                color: Colors.muted,
              }}
            >
              Add a Syn and start a conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openChat(item)}
            style={({ pressed }) => ({
              flexDirection: "row",

              alignItems: "center",

              paddingHorizontal: 18,

              paddingVertical: 14,

              backgroundColor: Colors.surface,

              borderBottomWidth: 1,

              borderBottomColor: Colors.border,

              opacity: pressed ? 0.65 : 1,
            })}
          >
            {/* Avatar */}

            <View
              style={{
                width: 54,

                height: 54,

                borderRadius: 27,

                backgroundColor: "#FFF1EB",

                justifyContent: "center",

                alignItems: "center",

                marginRight: 14,
              }}
            >
              <Ionicons name="person" size={26} color={Colors.primary} />
            </View>

            {/* Content */}

            <View
              style={{
                flex: 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",

                  alignItems: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,

                    fontSize: 16,

                    fontWeight: item.unread_count > 0 ? "800" : "700",

                    color: Colors.ink,
                  }}
                >
                  {item.display_name ?? item.username ?? "Syn User"}
                </Text>

                {item.last_message_at && (
                  <Text
                    style={{
                      marginLeft: 8,

                      fontSize: 11,

                      color: Colors.muted,
                    }}
                  >
                    {formatTime(item.last_message_at)}
                  </Text>
                )}
              </View>

              <View
                style={{
                  marginTop: 5,

                  flexDirection: "row",

                  alignItems: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,

                    fontSize: 13,

                    fontWeight: item.unread_count > 0 ? "700" : "400",

                    color: item.unread_count > 0 ? Colors.ink : Colors.muted,
                  }}
                >
                  {item.last_message ?? "Start a conversation"}
                </Text>

                {item.unread_count > 0 && (
                  <View
                    style={{
                      minWidth: 22,

                      height: 22,

                      paddingHorizontal: 6,

                      marginLeft: 8,

                      borderRadius: 11,

                      justifyContent: "center",

                      alignItems: "center",

                      backgroundColor: Colors.primary,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",

                        fontSize: 11,

                        fontWeight: "800",
                      }}
                    >
                      {item.unread_count > 99 ? "99+" : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue);

  const now = new Date();

  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  });
}
