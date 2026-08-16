import { Redirect, Tabs, router } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '@/providers/auth-provider'
import { Colors } from '@/constants/colors'
import { useState } from 'react'
import SynActionSheet from '@/components/SynActionSheet'

export default function TabsLayout() {
  const {
    session,
    profile,
    loading,
    profileLoading,
  } = useAuth()

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

  const [actionsVisible, setActionsVisible] = useState(false)

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,

        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'pulse' : 'pulse-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={size}
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
        onPress={() => setActionsVisible(true)}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: Colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: -18,
          alignSelf: 'center',
        }}
      >
        <Ionicons
          name="add"
          size={30}
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
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