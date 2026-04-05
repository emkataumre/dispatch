import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

// Haversine formula — returns distance in metres between two lat/lng points.
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useProximity(
  target: { lat: number; lng: number } | null,
  radiusMeters = 100
): { isNearby: boolean } {
  const [isNearby, setIsNearby] = useState(false)

  useEffect(() => {
    if (!target) {
      setIsNearby(false)
      return
    }

    let cancelled = false
    let subscription: Location.LocationSubscription | null = null

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
      },
      (location) => {
        const distance = getDistanceMeters(
          location.coords.latitude,
          location.coords.longitude,
          target.lat,
          target.lng
        )
        setIsNearby(distance <= radiusMeters)
      }
    )
      .then((sub) => {
        if (cancelled) { sub.remove(); return }
        subscription = sub
      })
      .catch(() => {
        // Location unavailable (permission denied, GPS off, emulator) — stay false
      })

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [target?.lat, target?.lng, radiusMeters])

  return { isNearby }
}
