import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import Mapbox from '@rnmapbox/maps'
import { useAuth } from '@/hooks/useAuth'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!mapboxToken) throw new Error('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is not set')
  Mapbox.setAccessToken(mapboxToken)

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(app)/(tabs)')
    }
  }, [session, loading, segments])

  return <Slot />
}
