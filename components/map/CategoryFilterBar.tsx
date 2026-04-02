import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native'
import { POI_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, PoiCategory } from '@/lib/poiCategories'

interface Props {
  value: Record<PoiCategory, boolean>
  onChange: (next: Record<PoiCategory, boolean>) => void
}

export function CategoryFilterBar({ value, onChange }: Props) {
  const toggle = (category: PoiCategory) => {
    onChange({ ...value, [category]: !value[category] })
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {POI_CATEGORIES.map((cat) => {
          const active = value[cat]
          const color = CATEGORY_COLORS[cat]
          return (
            <Pressable
              key={cat}
              onPress={() => toggle(cat)}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: color, borderColor: color }
                  : styles.pillInactive,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: active ? '#fff' : color }]} />
              <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  pillInactive: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
  labelInactive: {
    color: '#555',
  },
})
