import Mapbox from '@rnmapbox/maps'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Tables } from '@/types/supabase'
import { usePois } from '@/hooks/usePois'
import { useAllPoiRatings } from '@/hooks/useAllPoiRatings'
import { PoiLayer } from '@/components/map/PoiLayer'
import { CategoryFilterBar } from '@/components/map/CategoryFilterBar'
import { PoiBottomSheet } from '@/components/map/PoiBottomSheet'
import { PoiListView } from '@/components/map/PoiListView'
import { POI_CATEGORIES, PoiCategory } from '@/lib/poiCategories'

type Poi = Tables<'pois'>

const ALL_ACTIVE = Object.fromEntries(
  POI_CATEGORIES.map((c) => [c, true])
) as Record<PoiCategory, boolean>

export default function MapScreen() {
  const { pois } = usePois()
  const { avgRatings } = useAllPoiRatings()
  const [activeCategories, setActiveCategories] = useState<Record<PoiCategory, boolean>>(ALL_ACTIVE)
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const cameraRef = useRef<Mapbox.Camera>(null)
  const pendingCamera = useRef<Poi | null>(null)

  const filteredPois = useMemo(
    () => pois.filter((p) => activeCategories[p.category] !== false),
    [pois, activeCategories]
  )

  const handlePoiPress = useCallback((poi: Poi) => {
    setSelectedPoi(poi)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedPoi(null)
  }, [])

  const handleListRowPress = useCallback((poi: Poi) => {
    pendingCamera.current = poi
    setViewMode('map')
    setSelectedPoi(poi)
  }, [])

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

  return (
    <View style={styles.container}>
      {/* MapView stays mounted in list mode (display: none) so cameraRef stays alive */}
      <Mapbox.MapView style={[styles.map, viewMode === 'list' && styles.hidden]}>
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={[12.5683, 55.6761]}
        />
        <PoiLayer pois={filteredPois} onPoiPress={handlePoiPress} />
      </Mapbox.MapView>

      {viewMode === 'list' && (
        <PoiListView
          pois={filteredPois}
          avgRatings={avgRatings}
          onPoiPress={handleListRowPress}
        />
      )}

      <CategoryFilterBar value={activeCategories} onChange={setActiveCategories} />

      <Pressable style={styles.toggleButton} onPress={toggleViewMode}>
        <Ionicons
          name={viewMode === 'map' ? 'list' : 'map'}
          size={20}
          color="#fff"
        />
      </Pressable>

      <PoiBottomSheet poi={selectedPoi} onClose={handleSheetClose} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  hidden: { display: 'none' },
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
})
