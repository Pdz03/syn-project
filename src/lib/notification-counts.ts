import { supabase } from '@/lib/supabase'

export async function getChatUnreadTotal() {
  const { data, error } = await supabase.rpc('get_my_chats_with_receipts')

  if (error) {
    console.warn('CHAT UNREAD TOTAL:', error.message)
    return 0
  }

  return (data ?? []).reduce(
    (total: number, chat: { unread_count?: number }) =>
      total + Number(chat.unread_count ?? 0),
    0
  )
}

export async function getSynRequestCount(userId?: string | null) {
  if (!userId) {
    return 0
  }

  const { count, error } = await supabase
    .from('syn_requests')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('receiver_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.warn('SYN REQUEST COUNT:', error.message)
    return 0
  }

  return count ?? 0
}
