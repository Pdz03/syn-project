import { createClient } from 'npm:@supabase/supabase-js@2'

type MessageRecord = {
  id: string
  conversation_id: string
  sender_id: string
  type: 'text' | 'image' | 'nudge' | 'system'
  content: string | null
  created_at: string
}

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: MessageRecord
  old_record: MessageRecord | null
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload =
      await req.json()

    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'messages'
    ) {
      return Response.json({
        skipped: true,
      })
    }

    const message =
      payload.record

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')!

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )!

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      )

    // Cari member conversation
    // selain pengirim.
    const {
      data: members,
      error: memberError,
    } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq(
        'conversation_id',
        message.conversation_id
      )
      .neq(
        'user_id',
        message.sender_id
      )

    if (memberError) {
      throw memberError
    }

    if (!members?.length) {
      return Response.json({
        skipped: true,
        reason: 'No recipient',
      })
    }

    const recipientIds =
      members.map(
        (member) =>
          member.user_id
      )

    // Nama pengirim untuk title/body.
    const {
      data: senderProfile,
    } = await supabase
      .from('profiles')
      .select(
        'display_name, username'
      )
      .eq(
        'id',
        message.sender_id
      )
      .maybeSingle()

    const senderName =
      senderProfile?.display_name ??
      senderProfile?.username ??
      'Someone'

    // Ambil semua device token
    // milik penerima.
    const {
      data: pushTokens,
      error: tokenError,
    } = await supabase
      .from('push_tokens')
      .select(
        'expo_push_token, user_id'
      )
      .in(
        'user_id',
        recipientIds
      )

    if (tokenError) {
      throw tokenError
    }

    if (!pushTokens?.length) {
      return Response.json({
        skipped: true,
        reason:
          'Recipient has no push token',
      })
    }

    const body =
      message.type === 'nudge'
        ? `${senderName} nudged you 👋`
        : message.type === 'image'
          ? `${senderName} sent a photo`
          : message.content
            ? message.content
            : `${senderName} sent you a message`

    const notifications =
      pushTokens.map(
        (token) => ({
          to:
            token.expo_push_token,

          title:
            message.type === 'nudge'
              ? 'Syn Nudge 👋'
              : senderName,

          body,

          sound: 'default',

          priority: 'high',

          data: {
            type:
              message.type ===
              'nudge'
                ? 'nudge'
                : 'message',

            conversationId:
              message.conversation_id,

            senderId:
              message.sender_id,

            messageId:
              message.id,
          },
        })
      )

    const expoResponse =
      await fetch(
        'https://exp.host/--/api/v2/push/send',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',
          },

          body:
            JSON.stringify(
              notifications
            ),
        }
      )

    const expoResult =
      await expoResponse.json()

    console.log(
      'EXPO PUSH RESULT:',
      expoResult
    )

    return Response.json({
      success: true,
      result: expoResult,
    })
  } catch (error) {
    console.error(
      'SEND MESSAGE PUSH ERROR:',
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    )
  }
})