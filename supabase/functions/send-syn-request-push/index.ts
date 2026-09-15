import { createClient } from 'npm:@supabase/supabase-js@2'

type SynRequestRecord = {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
}

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: SynRequestRecord
  old_record: SynRequestRecord | null
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload =
      await req.json()

    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'syn_requests'
    ) {
      return Response.json({
        skipped: true,
      })
    }

    const request =
      payload.record

    if (
      request.status !== 'pending'
    ) {
      return Response.json({
        skipped: true,
        reason:
          'Request is not pending',
      })
    }

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

    // Ambil profile pengirim
    const {
      data: senderProfile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'display_name, username, syn_id'
      )
      .eq(
        'id',
        request.sender_id
      )
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    const senderName =
      senderProfile?.display_name ??
      senderProfile?.username ??
      'Someone'

    // Ambil token device penerima
    const {
      data: tokens,
      error: tokenError,
    } = await supabase
      .from('push_tokens')
      .select(
        'expo_push_token'
      )
      .eq(
        'user_id',
        request.receiver_id
      )

    if (tokenError) {
      throw tokenError
    }

    if (!tokens?.length) {
      return Response.json({
        skipped: true,
        reason:
          'Receiver has no push token',
      })
    }

    const notifications =
      tokens.map(
        (token) => ({
          to:
            token.expo_push_token,

          title:
            'New Syn Request',

          body:
            `${senderName} wants to be your Syn.`,

          sound:
            'default',

          priority:
            'high',

          data: {
            type:
              'syn_request',

            requestId:
              request.id,

            senderId:
              request.sender_id,
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
      'SYN REQUEST PUSH RESULT:',
      expoResult
    )

    return Response.json({
      success: true,
      result: expoResult,
    })
  } catch (error) {
    console.error(
      'SEND SYN REQUEST PUSH ERROR:',
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