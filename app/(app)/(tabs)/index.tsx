import Mapbox from '@rnmapbox/maps'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Tables } from '@/types/supabase'
import { usePois } from '@/hooks/usePois'
import { useAllPoiRatings } from '@/hooks/useAllPoiRatings'
import { useActivePresence } from '@/hooks/useActivePresence'
import { useLivePresences } from '@/hooks/useLivePresences'
import { PoiLayer } from '@/components/map/PoiLayer'
import { PresenceLayer } from '@/components/map/PresenceLayer'
import { CategoryFilterBar } from '@/components/map/CategoryFilterBar'
import { PoiBottomSheet } from '@/components/map/PoiBottomSheet'
import { PoiListView } from '@/components/map/PoiListView'
import { POI_CATEGORIES, PoiCategory } from '@/lib/poiCategories'

type Poi = Tables<'pois'>

const ALL_ACTIVE = Object.fromEntries(
  POI_CATEGORIES.map((c) => [c, true])
) as Record<PoiCategory, boolean>

export default function MapScreen() {
  const { pois, error: poisError } = usePois()
  const { avgRatings, error: ratingsError, refetch: refetchRatings } = useAllPoiRatings()
  const { activePresence, setBroadcast, clearBroadcast } = useActivePresence()
  const { presences, error: presenceError } = useLivePresences()
  const [activeCategories, setActiveCategories] = useState<Record<PoiCategory, boolean>>(ALL_ACTIVE)
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [locationGranted, setLocationGranted] = useState(false)
  const cameraRef = useRef<Mapbox.Camera>(null)
  const pendingCamera = useRef<Poi | null>(null)

  useEffect(() => {
    let active = true
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (active) setLocationGranted(status === 'granted')
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const filteredPois = useMemo(
    () => pois.filter((p) => activeCategories[p.category] !== false),
    [pois, activeCategories]
  )

  const handlePoiPress = useCallback((poi: Poi) => {
    setSelectedPoi(poi)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedPoi(null)
    refetchRatings()
  }, [refetchRatings])

  const handleListRowPress = useCallback((poi: Poi) => {
    pendingCamera.current = poi
    setViewMode('map')
    setSelectedPoi(poi)
  }, [])

  // setCamera must run after the map is visible again. Calling it synchronously inside
  // handleListRowPress (before the viewMode state update re-renders and unhides the map)
  // is unreliable — the native GL surface may not be ready. pendingCamera stores the
  // target POI so this effect can fire the camera command after the render commits.
  useEffect(() => {
    if (viewMode === 'map' && pendingCamera.current) {
      const poi = pendingCamera.current
      pendingCamera.current = null
      cameraRef.current?.setCamera({
        centerCoordinate: [poi.lng, poi.lat],
        zoomLevel: 15,
        animationDuration: 800,
      })
    }
  }, [viewMode])

  const toggleViewMode = useCallback(() => {
    setViewMode((v) => (v === 'map' ? 'list' : 'map'))
  }, [])

  const handleReturnToLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      cameraRef.current?.setCamera({
        centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
        zoomLevel: 15,
        animationDuration: 800,
      })
    } catch {
      // Location unavailable (e.g. emulator without mock GPS) — do nothing
    }
  }, [])

  return (
    <View style={styles.container}>
      {/* MapView stays mounted in list mode (display: none) — unmounting would destroy the
          native Mapbox GL context and invalidate cameraRef, requiring a full re-init on switch back */}
      <Mapbox.MapView style={[styles.map, viewMode === 'list' && styles.hidden]} styleURL={Mapbox.StyleURL.Light}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [12.5683, 55.6761],
            zoomLevel: 13,
          }}
        />
        <PoiLayer pois={filteredPois} onPoiPress={handlePoiPress} />
        <PresenceLayer presences={presences} pois={pois} onPoiPress={handlePoiPress} />
        {locationGranted && <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />}
      </Mapbox.MapView>

      {viewMode === 'list' && (
        <PoiListView
          pois={filteredPois}
          avgRatings={avgRatings}
          onPoiPress={handleListRowPress}
        />
      )}

      <CategoryFilterBar value={activeCategories} onChange={setActiveCategories} />

      <Pressable style={styles.toggleButton} onPress={toggleViewMode} testID="view-mode-toggle">
        <Ionicons
          name={viewMode === 'map' ? 'list' : 'map'}
          size={20}
          color="#fff"
        />
      </Pressable>

      {locationGranted && viewMode === 'map' && (
        <Pressable style={styles.locationButton} onPress={handleReturnToLocation} testID="return-to-location">
          <Ionicons name="locate" size={20} color="#fff" />
        </Pressable>
      )}

      {(poisError || ratingsError || presenceError) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {poisError
              ? "Couldn't load places — check your connection."
              : ratingsError
              ? 'Ratings unavailable.'
              : 'Live updates unavailable — check your connection.'}
          </Text>
        </View>
      )}

      <PoiBottomSheet
        poi={selectedPoi}
        onClose={handleSheetClose}
        activePresence={activePresence}
        onBroadcast={setBroadcast}
        onDismissBroadcast={clearBroadcast}
        locationGranted={locationGranted}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  hidden: { display: 'none' },
  errorBanner: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(180, 30, 30, 0.92)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131313',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  locationButton: {
    position: 'absolute',
    top: 104,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131313',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
})
