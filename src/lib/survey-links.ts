import { Alert, Linking } from 'react-native'

import { supabase } from '@/lib/supabase'

export type SurveyLink = {
  id: string
  title: string
  url: string
}

export async function getActiveSurveyLink() {
  const { data, error } = await supabase
    .from('survey_links')
    .select('id, title, url')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('ACTIVE SURVEY LINK:', error.message)
    return null
  }

  return data as SurveyLink | null
}

export async function openSurveyLink(link: SurveyLink | null) {
  if (!link?.url) {
    Alert.alert('Survey unavailable', 'Survey belum tersedia.')
    return
  }

  const supported = await Linking.canOpenURL(link.url)

  if (!supported) {
    Alert.alert('Unable to open survey', 'Link survey tidak valid.')
    return
  }

  await Linking.openURL(link.url)
}
