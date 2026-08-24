import { StyleSheet, View } from 'react-native'

import { Ionicons } from '@expo/vector-icons'

import { Colors } from '@/constants/colors'
import { SynListItem, SynModal } from '@/components/syn-ui'

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
    <SynModal
      visible={visible}
      onClose={onClose}
      title="Create"
    >
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
    </SynModal>
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
    <SynListItem
      title={title}
      subtitle={description}
      onPress={onPress}
      chevron
      left={
        <View style={styles.iconWrap}>
          <Ionicons
            name={icon}
            size={22}
            color={Colors.primary}
          />
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
})
