import { Pressable, Text, View, StyleSheet } from 'react-native'
import { Tables } from '@/types/supabase'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/poiCategories'

type Poi = Tables<'pois'>

type Props = {
  poi: Poi
  avgRating: number | null
  onPress: (poi: Poi) => void
}

export function PoiListRow({ poi, avgRating, onPress }: Props) {
  const color = CATEGORY_COLORS[poi.category]
  const label = CATEGORY_LABELS[poi.category]

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPress(poi)}
      testID="poi-list-row"
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{poi.name}</Text>
        <View style={[styles.pill, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[styles.pillText, { color }]}>{label}</Text>
        </View>
      </View>
      <Text style={avgRating !== null ? styles.rating : styles.noRating}>
        {avgRating !== null ? `★ ${avgRating.toFixed(1)}` : 'No ratings'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  left: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131313',
    letterSpacing: -0.2,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5A623',
    letterSpacing: -0.1,
  },
  noRating: {
    fontSize: 12,
    color: '#BBBBBB',
    fontStyle: 'italic',
  },
})
