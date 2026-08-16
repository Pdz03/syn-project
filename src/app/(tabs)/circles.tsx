import { View, Text } from 'react-native'
import { Colors } from '@/constants/colors'

export default function CirclesScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
      }}
    >
      <Text style={{ color: Colors.ink }}>
        Circles
      </Text>
    </View>
  )
}