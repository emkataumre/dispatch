import Mapbox from '@rnmapbox/maps'
import { StyleSheet } from 'react-native'

export default function MapScreen() {
  return (
    <Mapbox.MapView style={styles.map}>
      <Mapbox.Camera
        zoomLevel={13}
        centerCoordinate={[12.5683, 55.6761]}
      />
    </Mapbox.MapView>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
})
