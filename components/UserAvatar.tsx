import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

interface UserAvatarProps {
  displayName: string
  avatarUrl: string | null
  size?: number
  borderWidth?: number
  borderColor?: string
}

const BUBBLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
]

export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function getBubbleColor(displayName: string): string {
  let hash = 0
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash * 31 + displayName.charCodeAt(i)) & 0xffff
  }
  return BUBBLE_COLORS[hash % BUBBLE_COLORS.length]
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size = 32,
  borderWidth = 2,
  borderColor = '#ffffff',
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  // Fall back to '?' placeholder if displayName is empty to avoid an invisible circle
  const effectiveName = displayName.trim() || '?'
  const initials = getInitials(effectiveName)
  const bgColor = getBubbleColor(effectiveName)
  const radius = size / 2

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    borderWidth,
    borderColor,
    overflow: 'hidden' as const,
  }

  if (avatarUrl && !imageError) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          onError={() => {
            console.warn('UserAvatar: failed to load avatar image', avatarUrl)
            setImageError(true)
          }}
        />
      </View>
    )
  }

  return (
    <View style={[containerStyle, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  initials: {
    color: '#ffffff',
    fontWeight: '700',
  },
})
