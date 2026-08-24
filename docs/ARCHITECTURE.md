# Syn Architecture

## Mobile

React Native + Expo + TypeScript.

Routing:
Expo Router.

Route root:
src/app

Main route groups:

src/app/(auth)
src/app/(setup)
src/app/(tabs)
src/app/chat/[id].tsx

---

## Backend

Supabase provides:

- PostgreSQL
- Auth
- Realtime
- Edge Functions
- RLS

---

## Core Data

profiles
syn_requests
friendships
conversations
conversation_members
messages
message_reactions
user_blocks
push_tokens

---

## Important RPCs

- search_syn_users
- get_relationship_state
- send_syn_request
- accept_syn_request
- decline_syn_request
- cancel_syn_request
- remove_syn
- block_user
- unblock_user
- get_or_create_direct_conversation
- send_message
- send_nudge
- mark_conversation_read
- get_my_chats

Do not change existing RPC contracts without explicit approval.

---

## Authentication Flow

Register
→ Verify Email
→ Auth callback
→ Setup Profile
→ Welcome
→ Tabs

Existing users:

Login
→ root route controller
→ appropriate screen

---

## Social Flow

Search user
→ Add Syn
→ Syn Request
→ Accept
→ Friendship
→ Message

---

## Messaging

Direct conversations are stored in conversations.

Membership:
conversation_members

Messages:
messages

Messages use Supabase Realtime Postgres Changes for the current MVP.

---

## Push Notifications

Device:

Expo Notifications
→ ExpoPushToken
→ push_tokens

Server:

database trigger
→ Supabase Edge Function
→ Expo Push API
→ FCM
→ Android

Currently supported:

- Message
- Nudge
- Syn Request

Notification taps are handled by:

src/app/_layout.tsx