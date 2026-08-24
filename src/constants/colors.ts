// constants/colors.ts

export const Colors = {
  primary: '#FF6B35',
  secondary: '#3157D5',

  ink: '#17181C',
  background: '#F8F8FA',
  surface: '#FFFFFF',

  muted: '#70737D',
  border: '#E7E8EC',

  primaryTint: '#FFF1EB',
  primaryAlpha: 'rgba(255,107,53,0.14)',
  primaryShadow: 'rgba(255,107,53,0.28)',
  secondaryTint: '#EEF2FD',

  danger: '#D64545',
}

export const SynSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  gutter: 22,
  xxl: 28,
  xxxl: 32,
} as const

export const SynRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  card: 20,
  sheet: 28,
  pill: 999,
} as const

export const SynTypography = {
  logo: {
    fontSize: 42,
    fontWeight: '800',
  },
  h1: {
    fontSize: 28,
    fontWeight: '800',
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
  },
} as const
