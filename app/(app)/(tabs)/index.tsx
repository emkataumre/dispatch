import Mapbox from '@rnmapbox/maps'
import { StyleSheet } from 'react-native'
import { Tables } from '@/types/supabase'
import { usePois } from '@/hooks/usePois'
import { PoiLayer } from '@/components/map/PoiLayer'

type Poi = Tables<'pois'>

export default function MapScreen() {
  const { pois } = usePois()

  const handlePoiPress = (poi: Poi) => {
    // Bottom sheet — Phase 2 next task
    console.log('POI tapped:', poi.name, poi.category)
  }

  return (
    <Mapbox.MapView style={styles.map}>
      <Mapbox.Camera
        zoomLevel={13}
        centerCoordinate={[12.5683, 55.6761]}
      />
      <PoiLayer pois={pois} onPoiPress={handlePoiPress} />
    </Mapbox.MapView>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
})
