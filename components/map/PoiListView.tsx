import { FlatList, Text, View, StyleSheet } from 'react-native'
import { Tables } from '@/types/supabase'
import { PoiListRow } from '@/components/map/PoiListRow'

type Poi = Tables<'pois'>

type Props = {
  pois: Poi[]
  avgRatings: Record<string, number>
  onPoiPress: (poi: Poi) => void
}

function Separator() {
  return <View style={styles.separator} />
}

export function PoiListView({ pois, avgRatings, onPoiPress }: Props) {
  if (pois.length === 0) {
    return (
      <View style={styles.emptyContainer} testID="poi-list-empty">
        <Text style={styles.emptyText}>No POIs match your filters.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={pois}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PoiListRow
          poi={item}
          avgRating={avgRatings[item.id] ?? null}
          onPress={onPoiPress}
        />
      )}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.listContent}
      style={styles.list}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  listContent: {
    paddingBottom: 80,
  },
  separator: {
    height: 1,
    backgroundColor: '#EDECEA',
    marginHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF8',
  },
  emptyText: {
    fontSize: 15,
    color: '#AAAAAA',
    fontStyle: 'italic',
  },
})
