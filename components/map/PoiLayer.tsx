import { useMemo, useCallback } from 'react'
import Mapbox from '@rnmapbox/maps'
import { Tables } from '@/types/supabase'
import { POI_CATEGORIES, CATEGORY_COLORS } from '@/lib/poiCategories'

type Poi = Tables<'pois'>

interface Props {
  pois: Poi[]
  onPoiPress: (poi: Poi) => void
}

// Mapbox 'match' expression: ['match', input, v1, out1, v2, out2, ..., fallback]
const circleColorExpression = [
  'match',
  ['get', 'category'],
  ...POI_CATEGORIES.flatMap((cat) => [cat, CATEGORY_COLORS[cat]]),
  '#999999', // fallback
] as const

const circleStyle = {
  circleColor: circleColorExpression,
  circleRadius: 8,
  circleStrokeColor: '#ffffff',
  circleStrokeWidth: 2,
}

const labelStyle = {
  textField: '{name}',
  textSize: 12,
  textOffset: [0, 1.5] as [number, number],
  textAnchor: 'top' as const,
  textColor: '#333333',
  textHaloColor: '#ffffff',
  textHaloWidth: 1.5,
  textOptional: true,
}

export function PoiLayer({ pois, onPoiPress }: Props) {
  const featureCollection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: pois.map((poi) => ({
      type: 'Feature' as const,
      id: poi.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [poi.lng, poi.lat],
      },
      properties: {
        id: poi.id,
        name: poi.name,
        category: poi.category,
      },
    })),
  }), [pois])

  const poiById = useMemo(
    () => new Map(pois.map((p) => [p.id, p])),
    [pois],
  )

  const handlePress = useCallback((event: { features: { properties?: { id?: string } | null }[] }) => {
    const feature = event.features[0]
    if (!feature) return
    const poi = poiById.get(feature.properties?.id ?? '')
    if (poi) onPoiPress(poi)
  }, [poiById, onPoiPress])

  return (
    <Mapbox.ShapeSource
      id="poi-source"
      shape={featureCollection}
      onPress={handlePress}
      hitbox={{ width: 30, height: 30 }}
    >
      <Mapbox.CircleLayer
        id="poi-circles"
        style={circleStyle}
      />
      <Mapbox.SymbolLayer
        id="poi-labels"
        style={labelStyle}
        minZoomLevel={15}
      />
    </Mapbox.ShapeSource>
  )
}
