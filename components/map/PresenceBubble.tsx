import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

interface Props {
  displayName: string
  avatarUrl: string | null
  size?: number
}

const BUBBLE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
]

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function getBubbleColor(displayName: string): string {
  let hash = 0
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash * 31 + displayName.charCodeAt(i)) & 0xffff
  }
  return BUBBLE_COLORS[hash % BUBBLE_COLORS.length]
}

export function PresenceBubble({ displayName, avatarUrl, size = 32 }: Props) {
  const [imageError, setImageError] = useState(false)
  const initials = getInitials(displayName)
  const bgColor = getBubbleColor(displayName)
  const radius = size / 2

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden' as const,
  }

  if (avatarUrl && !imageError) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          onError={() => setImageError(true)}
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
