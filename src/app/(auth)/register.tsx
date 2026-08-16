import {
  useState,
} from 'react'

import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import {
  router,
} from 'expo-router'

import {
  supabase,
} from '@/lib/supabase'

import {
  Colors,
} from '@/constants/colors'

export default function RegisterScreen() {
  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [loading, setLoading] =
    useState(false)

  async function handleRegister() {
    const cleanEmail =
      email.trim().toLowerCase()

    if (
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Belum lengkap',
        'Isi semua field terlebih dahulu.'
      )

      return
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        'Password berbeda',
        'Konfirmasi password harus sama.'
      )

      return
    }

    if (password.length < 8) {
      Alert.alert(
        'Password terlalu pendek',
        'Gunakan minimal 8 karakter.'
      )

      return
    }

    try {
      setLoading(true)

      console.log('REGISTER START')
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        })

      if (error) {
        Alert.alert(
          'Registrasi gagal',
          error.message
        )

        return
      }

      if (!data.session) {
        router.replace({
          pathname:
            '/(auth)/verify-email',
          params: {
            email: cleanEmail,
          },
        })
      }
console.log(
  'REGISTER RESULT:',
  data,
  error
)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          Colors.background,

        justifyContent:
          'center',

        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 42,
          fontWeight: '800',
          color: Colors.primary,
        }}
      >
        syn
      </Text>

      <Text
        style={{
          marginTop: 8,
          marginBottom: 32,
          fontSize: 20,
          fontWeight: '600',
          color: Colors.ink,
        }}
      >
        Create your account
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType=
          "email-address"
        autoCapitalize="none"
        style={inputStyle}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={inputStyle}
      />

      <TextInput
        placeholder=
          "Confirm password"
        value={confirmPassword}
        onChangeText={
          setConfirmPassword
        }
        secureTextEntry
        style={inputStyle}
      />

      <Pressable
        disabled={loading}
        onPress={handleRegister}
        style={{
          marginTop: 12,
          backgroundColor:
            Colors.primary,

          paddingVertical: 16,

          borderRadius: 14,

          alignItems: 'center',

          opacity:
            loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: '#fff',
              fontWeight: '700',
            }}
          >
            Create Account
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() =>
          router.push(
            '/(auth)/login'
          )
        }
        style={{
          marginTop: 20,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color:
              Colors.secondary,
          }}
        >
          Already have an account?
          {' '}Sign in
        </Text>
      </Pressable>
    </View>
  )
}

const inputStyle = {
  backgroundColor:
    Colors.surface,

  borderWidth: 1,

  borderColor:
    Colors.border,

  paddingHorizontal: 16,

  paddingVertical: 14,

  borderRadius: 14,

  marginBottom: 12,
}