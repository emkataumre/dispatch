import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'

type Props = {
  onGranted: () => void
}

export function BackgroundPermissionBanner({ onGranted }: Props) {
  const [requesting, setRequesting] = useState(false)

  const handlePress = async () => {
    setRequesting(true)
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync()
      if (status === 'granted') onGranted()
    } catch (err) {
      console.error('[BackgroundPermissionBanner] request failed:', err)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Allow background location to get automatic check-ins when you visit places.
      </Text>
      <Pressable onPress={handlePress} style={styles.button} disabled={requesting}>
        <Text style={styles.buttonText}>{requesting ? 'Requesting...' : 'Enable'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(19, 19, 19, 0.88)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: '#131313',
    fontSize: 13,
    fontWeight: '700',
  },
})
