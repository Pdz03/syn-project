import type { ReactNode } from 'react'

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type ImageSourcePropType,
  type ImageStyle,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  View,
} from 'react-native'

import { Ionicons } from '@expo/vector-icons'

import {
  Colors,
  SynRadius,
  SynSpacing,
} from '@/constants/colors'

type IconName = keyof typeof Ionicons.glyphMap

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type SynBrandLogoProps = {
  variant?: 'orange' | 'white'
  width?: number
  height?: number
  style?: StyleProp<ImageStyle>
}

export function SynBrandLogo({
  variant = 'orange',
  width = 72,
  height = 46,
  style,
}: SynBrandLogoProps) {
  return (
    <Image
      source={
        variant === 'white'
          ? require('@/assets/images/syn_brand_white.png')
          : require('@/assets/images/syn_brand.png')
      }
      resizeMode="contain"
      style={[
        {
          width,
          height,
        },
        style,
      ]}
    />
  )
}

type SynButtonProps = PressableProps & {
  title: string
  variant?: ButtonVariant
  loading?: boolean
  icon?: IconName
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function SynButton({
  title,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  style,
  textStyle,
  ...props
}: SynButtonProps) {
  const isDisabled = disabled || loading
  const isPrimary = variant === 'primary' || variant === 'danger'
  const color = variant === 'danger' ? Colors.danger : Colors.primary

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (pressed || isDisabled) && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : color} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isPrimary ? '#FFFFFF' : color}
            />
          )}

          <Text
            style={[
              styles.buttonText,
              isPrimary
                ? styles.buttonTextPrimary
                : { color },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  )
}

export function SynInput({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onPressRightIcon,
  containerStyle,
  style,
  ...props
}: TextInputProps & {
  label?: string
  hint?: string
  error?: string
  leftIcon?: IconName
  rightIcon?: IconName
  onPressRightIcon?: () => void
  containerStyle?: StyleProp<ViewStyle>
}) {
  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrap,
          error && styles.inputWrapError,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={Colors.muted}
          />
        )}

        <TextInput
          placeholderTextColor={Colors.muted}
          style={[styles.input, style]}
          {...props}
        />

        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            onPress={onPressRightIcon}
            style={styles.inputIconButton}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={Colors.muted}
            />
          </Pressable>
        )}
      </View>

      {(error || hint) && (
        <Text
          style={[
            styles.hint,
            error && styles.errorText,
          ]}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  )
}

export function SynAvatar({
  name,
  uri,
  source,
  size = 48,
  color = Colors.primary,
}: {
  name?: string | null
  uri?: string | null
  source?: ImageSourcePropType
  size?: number
  color?: string
}) {
  const initial = name?.trim()?.[0]?.toUpperCase()
  const imageSource = source ?? (uri ? { uri } : null)

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        />
      ) : initial ? (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: Math.round(size * 0.38),
            fontWeight: '800',
          }}
        >
          {initial}
        </Text>
      ) : (
        <Ionicons
          name="person"
          size={Math.round(size * 0.48)}
          color="#FFFFFF"
        />
      )}
    </View>
  )
}

export function SynCard({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SynHeader({
  title,
  subtitle,
  onBack,
  right,
  style,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.header, style]}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.headerBack}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={Colors.ink}
          />
        </Pressable>
      )}

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>

      {right}
    </View>
  )
}

export function SynListItem({
  title,
  subtitle,
  meta,
  left,
  badge,
  chevron = false,
  onPress,
}: {
  title: string
  subtitle?: string
  meta?: string
  left?: ReactNode
  badge?: ReactNode
  chevron?: boolean
  onPress?: () => void
}) {
  const Content = (
    <View style={styles.listItemInner}>
      {left}

      <View style={styles.listBody}>
        <View style={styles.listTitleRow}>
          <Text
            numberOfLines={1}
            style={styles.listTitle}
          >
            {title}
          </Text>

          {meta && <Text style={styles.listMeta}>{meta}</Text>}
        </View>

        {subtitle && (
          <Text
            numberOfLines={1}
            style={styles.listSubtitle}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {badge}
      {chevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.muted}
        />
      )}
    </View>
  )

  if (!onPress) {
    return <View style={styles.listItem}>{Content}</View>
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        pressed && styles.pressed,
      ]}
    >
      {Content}
    </Pressable>
  )
}

export function SynBadge({
  label,
  tone = 'primary',
}: {
  label: string | number
  tone?: 'primary' | 'secondary' | 'muted'
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'secondary' && styles.badgeSecondary,
        tone === 'muted' && styles.badgeMuted,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  )
}

export function SynModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={styles.modalBackdrop}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.modalSheet}
        >
          <View style={styles.sheetHandle} />
          {title && <Text style={styles.modalTitle}>{title}</Text>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function SynEmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: IconName
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <View style={styles.emptyState}>
      {icon && (
        <View style={styles.emptyIcon}>
          <Ionicons
            name={icon}
            size={32}
            color={Colors.muted}
          />
        </View>
      )}

      <Text style={styles.emptyTitle}>{title}</Text>
      {body && <Text style={styles.emptyBody}>{body}</Text>}
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: SynSpacing.lg,
    paddingVertical: 14,
    borderRadius: SynRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SynSpacing.sm,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDanger: {
    backgroundColor: Colors.danger,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.65,
  },
  label: {
    marginBottom: 7,
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  inputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SynSpacing.sm,
    paddingHorizontal: 14,
    borderRadius: SynRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputWrapError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: Colors.ink,
    fontSize: 15,
  },
  inputIconButton: {
    padding: 4,
  },
  hint: {
    marginTop: 6,
    color: Colors.muted,
    fontSize: 12,
  },
  errorText: {
    color: Colors.danger,
  },
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: SynSpacing.lg,
    borderRadius: SynRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: SynSpacing.xl,
    paddingBottom: SynSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: {
    marginRight: SynSpacing.lg,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    color: Colors.muted,
    fontSize: 13,
  },
  listItem: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemInner: {
    minHeight: 72,
    paddingHorizontal: SynSpacing.xl,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listBody: {
    flex: 1,
    minWidth: 0,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: {
    flex: 1,
    color: Colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    marginLeft: SynSpacing.sm,
    color: Colors.muted,
    fontSize: 11,
  },
  listSubtitle: {
    marginTop: 4,
    color: Colors.muted,
    fontSize: 13,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: SynRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  badgeSecondary: {
    backgroundColor: Colors.secondary,
  },
  badgeMuted: {
    backgroundColor: Colors.muted,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  modalSheet: {
    paddingHorizontal: SynSpacing.xl,
    paddingTop: SynSpacing.md,
    paddingBottom: SynSpacing.xxxl,
    borderTopLeftRadius: SynRadius.sheet,
    borderTopRightRadius: SynRadius.sheet,
    backgroundColor: Colors.surface,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    marginBottom: SynSpacing.xl,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: Colors.border,
  },
  modalTitle: {
    marginBottom: SynSpacing.lg,
    color: Colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SynSpacing.xxxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  emptyTitle: {
    marginTop: SynSpacing.lg,
    color: Colors.ink,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 6,
    color: Colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: SynSpacing.xl,
    alignSelf: 'stretch',
  },
})
