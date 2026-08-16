import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { supabase } from '../lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing...')

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, syn_id, username, display_name')
      .limit(1)

    if (error) {
      console.log(error)
      setStatus(`Error: ${error.message}`)
      return
    }

    console.log(data)
    setStatus('Supabase connected ✅')
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>{status}</Text>
    </View>
  )
}
