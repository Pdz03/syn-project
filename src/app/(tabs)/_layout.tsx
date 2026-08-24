import { Redirect, Tabs, router } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '@/providers/auth-provider'
import { Colors } from '@/constants/colors'
import { useState, useEffect } from 'react'
import SynActionSheet from '@/components/SynActionSheet'
import { registerForPushNotifications }
  from '@/lib/notifications'
import { checkForAppUpdate } from '@/lib/app-updates'

export default function TabsLayout() {
  const {
    session,
    profile,
    loading,
    profileLoading,
  } = useAuth()

  const [actionsVisible, setActionsVisible] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    registerForPushNotifications(
      session.user.id
    )

    checkForAppUpdate({
      userId: session.user.id,
      silent: true,
    })
  }, [session?.user?.id])

  if (loading || profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  if (!profile?.display_name || !profile?.username) {
    return <Redirect href="/(setup)/profile" />
  }

  if (!profile.onboarding_completed) {
    return <Redirect href="/(setup)/welcome" />
  }


  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.muted,
          tabBarHideOnKeyboard: true,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'pulse' : 'pulse-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarLabel: '',
            tabBarButton: () => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setActionsVisible(true)}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={28}
                  color="#FFFFFF"
                />
              </Pressable>
            ),
          }}
        />

      <Tabs.Screen
        name="circles"
        options={{
          title: 'Circles',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      </Tabs>

      <SynActionSheet
        visible={actionsVisible}
        onClose={() => setActionsVisible(false)}

      onNewStatus={() => {
        setActionsVisible(false)
        console.log('NEW STATUS')
      }}

      onAddSyn={() => {
        setActionsVisible(false)

        setTimeout(() => {
          router.push('/add-syn')
        }, 150)
      }}

      onScanSynCode={() => {
        setActionsVisible(false)
        console.log('SCAN SYN CODE')
      }}

      onCreateCircle={() => {
        setActionsVisible(false)
        console.log('CREATE CIRCLE')
      }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -14,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  pressed: {
    opacity: 0.75,
  },
})
