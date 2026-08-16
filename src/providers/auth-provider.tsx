import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

import type {
  Session,
  User,
} from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  syn_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  status_text: string | null
  bio: string | null
  onboarding_completed: boolean
}

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  )

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [profileLoading, setProfileLoading] =
    useState(false)

  async function loadProfile(
    userId: string
  ) {
    try {
      setProfileLoading(true)

      const { data, error } =
        await supabase
          .from('profiles')
          .select(`
            id,
            syn_id,
            username,
            display_name,
            avatar_url,
            status_text,
            bio,
            onboarding_completed
          `)
          .eq('id', userId)
          .single()

      if (error) {
        console.error(
          'PROFILE ERROR:',
          error
        )

        setProfile(null)
        return
      }

      setProfile(data)
    } finally {
      setProfileLoading(false)
    }
  }

  async function refreshProfile() {
    if (!session?.user) return

    await loadProfile(
      session.user.id
    )
  }

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      setSession(session)

      if (session?.user) {
        await loadProfile(
          session.user.id
        )
      }

      setLoading(false)
    }

    initialize()

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, newSession) => {
          console.log(
            'AUTH EVENT:',
            event
          )

          setSession(newSession)

          if (!newSession?.user) {
            setProfile(null)
            setLoading(false)
            return
          }

          const userId =
            newSession.user.id

          // Jangan await Supabase call langsung
          // di callback onAuthStateChange.
          setTimeout(() => {
            loadProfile(userId)
          }, 0)

          setLoading(false)
        }
      )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user:
          session?.user ?? null,
        profile,
        loading,
        profileLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    )
  }

  return context
}