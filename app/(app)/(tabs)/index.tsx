import Mapbox from '@rnmapbox/maps'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Tables } from '@/types/supabase'
import { usePois } from '@/hooks/usePois'
import { PoiLayer } from '@/components/map/PoiLayer'
import { CategoryFilterBar } from '@/components/map/CategoryFilterBar'
import { POI_CATEGORIES, PoiCategory } from '@/lib/poiCategories'

type Poi = Tables<'pois'>

const ALL_ACTIVE = Object.fromEntries(
  POI_CATEGORIES.map((c) => [c, true])
) as Record<PoiCategory, boolean>

export default function MapScreen() {
  const { pois } = usePois()
  const [activeCategories, setActiveCategories] = useState<Record<PoiCategory, boolean>>(ALL_ACTIVE)

  const filteredPois = useMemo(
    () => pois.filter((p) => activeCategories[p.category] !== false),
    [pois, activeCategories]
  )

  const handlePoiPress = useCallback((poi: Poi) => {
    // Bottom sheet — Phase 2 next task
    console.log('POI tapped:', poi.name, poi.category)
  }, [])

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          zoomLevel={13}
          centerCoordinate={[12.5683, 55.6761]}
        />
        <PoiLayer pois={filteredPois} onPoiPress={handlePoiPress} />
      </Mapbox.MapView>
      <CategoryFilterBar value={activeCategories} onChange={setActiveCategories} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
})
