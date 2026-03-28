import {
  POI_CATEGORIES,
  CATEGORY_LABELS,
  isPoiCategory,
} from '../poiCategories'

describe('POI_CATEGORIES', () => {
  it('contains exactly 5 categories', () => {
    expect(POI_CATEGORIES).toHaveLength(5)
  })

  it('has no duplicates', () => {
    const unique = new Set(POI_CATEGORIES)
    expect(unique.size).toBe(POI_CATEGORIES.length)
  })

  it('contains the expected category slugs', () => {
    expect(POI_CATEGORIES).toEqual([
      'food_drink',
      'nightlife',
      'culture',
      'study_spots',
      'hidden_gems',
    ])
  })
})

describe('CATEGORY_LABELS', () => {
  it('has a label for every category in POI_CATEGORIES', () => {
    for (const category of POI_CATEGORIES) {
      expect(CATEGORY_LABELS).toHaveProperty(category)
      expect(typeof CATEGORY_LABELS[category]).toBe('string')
      expect(CATEGORY_LABELS[category].length).toBeGreaterThan(0)
    }
  })

  it('has no extra keys beyond POI_CATEGORIES', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(POI_CATEGORIES.length)
  })
})

describe('isPoiCategory', () => {
  it('returns true for every valid category', () => {
    for (const category of POI_CATEGORIES) {
      expect(isPoiCategory(category)).toBe(true)
    }
  })

  it('returns false for an arbitrary string', () => {
    expect(isPoiCategory('restaurants')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isPoiCategory('')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isPoiCategory(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isPoiCategory(undefined)).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isPoiCategory(42)).toBe(false)
  })
})
