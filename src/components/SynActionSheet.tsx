import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'

type Props = {
  visible: boolean
  onClose: () => void
  onNewStatus: () => void
  onAddSyn: () => void
  onScanSynCode: () => void
  onCreateCircle: () => void
}

export default function SynActionSheet({
  visible,
  onClose,
  onNewStatus,
  onAddSyn,
  onScanSynCode,
  onCreateCircle,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.28)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
          }}
        >
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: Colors.border,
              alignSelf: 'center',
              marginBottom: 22,
            }}
          />

          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: Colors.ink,
              marginBottom: 16,
            }}
          >
            Create
          </Text>

          <ActionItem
            icon="create-outline"
            title="New Status"
            description="Share a short update with your Syns"
            onPress={onNewStatus}
          />

          <ActionItem
            icon="person-add-outline"
            title="Add Syn"
            description="Find someone by username or Syn ID"
            onPress={onAddSyn}
          />

          <ActionItem
            icon="qr-code-outline"
            title="Scan Syn Code"
            description="Connect using a Syn Code"
            onPress={onScanSynCode}
          />

          <ActionItem
            icon="people-outline"
            title="Create Circle"
            description="Create a private space for your people"
            onPress={onCreateCircle}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ActionItem({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          backgroundColor: '#FFF1EB',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}
      >
        <Ionicons
          name={icon}
          size={22}
          color={Colors.primary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: Colors.ink,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            marginTop: 3,
            fontSize: 13,
            lineHeight: 18,
            color: Colors.muted,
          }}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.muted}
      />
    </Pressable>
  )
}