# Syn AI Agent Rules

## Read First

Before changing any code, read:

1. docs/AGENT_RULES.md
2. docs/ARCHITECTURE.md
3. docs/DESIGN_REFERENCE.md
4. docs/PRODUCT_ROADMAP.md

Then inspect the existing codebase.

---

# Project

Syn is a private social messenger.

Tagline:
Stay close to your people.

Core concepts:

- Syns = mutual connections
- Syn ID = permanent unique user identifier
- Nudge = lightweight attention interaction / "colek"
- Circle = private group
- Updates = private chronological social feed

Syn is NOT intended to become another public follower-based
social network.

---

# Production Codebase

The actual application is:

./syn

Stack:

- React Native
- Expo
- TypeScript
- Expo Router
- Supabase
- Supabase Auth
- Supabase Realtime
- Supabase Edge Functions
- Expo Notifications

Routes are under:

src/app

Do not create another root app directory.

---

# Design Reference

The Figma Make generated project is located at:

../MobileAppUIConcept_Syn

It is a DESIGN REFERENCE.

It may contain:
- React web code
- CSS
- HTML
- generated components

DO NOT migrate Syn to the Figma project's framework.

DO NOT copy web components directly into React Native.

Translate the visual design into proper React Native components.

---

# Existing Working Features

These features already work and MUST NOT regress:

- Register
- Login
- Email verification
- Password recovery groundwork
- Profile setup
- Syn ID generation
- Add Syn
- Search Syn
- Syn Request
- Accept / Decline
- Friendship
- Direct conversation
- Realtime messaging
- Nudge
- Chats list
- Unread count
- Mark as read
- Push token registration
- Message push notifications
- Nudge push notifications
- Syn Request notifications
- Notification deep linking

---

# Backend Safety

Unless explicitly instructed, DO NOT modify:

- database schema
- RLS policies
- existing RPC signatures
- auth architecture
- Edge Functions
- database triggers
- realtime implementation
- push notification backend

UI refactoring must preserve existing behavior.

---

# Development Rules

Work incrementally.

Do not rewrite the entire application.

Before modifying a screen:

1. Understand its current behavior.
2. Identify Supabase/RPC calls it depends on.
3. Preserve those calls.
4. Replace/refactor only UI where possible.

After changes ensure:

- TypeScript compiles
- navigation works
- auth works
- realtime chat works
- push notifications remain functional

Do not introduce a new dependency unless there is a clear reason.