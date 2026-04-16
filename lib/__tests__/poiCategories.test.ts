import { POI_CATEGORIES, CATEGORY_LABELS, PoiCategory, isPoiCategory } from "../poiCategories";

describe("POI_CATEGORIES", () => {
  it("contains exactly 5 categories", () => {
    expect(POI_CATEGORIES).toHaveLength(5);
  });

  it("has no duplicates", () => {
    const unique = new Set(POI_CATEGORIES);
    expect(unique.size).toBe(POI_CATEGORIES.length);
  });

  it("contains the expected category slugs", () => {
    expect(POI_CATEGORIES).toEqual([
      "food_drink",
      "nightlife",
      "culture",
      "study_spots",
      "hidden_gems",
    ]);
  });
});

describe("CATEGORY_LABELS", () => {
  it("has a label for every category in POI_CATEGORIES", () => {
    for (const category of POI_CATEGORIES) {
      expect(CATEGORY_LABELS).toHaveProperty(category);
      expect(typeof CATEGORY_LABELS[category]).toBe("string");
      expect(CATEGORY_LABELS[category].length).toBeGreaterThan(0);
    }
  });

  it("has no extra keys beyond POI_CATEGORIES", () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(POI_CATEGORIES.length);
  });
});

// Minimal POI shape needed for filter tests
type FilterPoi = { category: PoiCategory };

function filterByActiveCategories(
  pois: FilterPoi[],
  active: Record<PoiCategory, boolean>,
): FilterPoi[] {
  return pois.filter((p) => active[p.category]);
}

const ALL_ACTIVE = Object.fromEntries(POI_CATEGORIES.map((c) => [c, true])) as Record<
  PoiCategory,
  boolean
>;

describe("category filter logic", () => {
  const samplePois: FilterPoi[] = [
    { category: "food_drink" },
    { category: "food_drink" },
    { category: "nightlife" },
    { category: "culture" },
    { category: "study_spots" },
    { category: "hidden_gems" },
  ];

  it("returns all POIs when all categories are active", () => {
    expect(filterByActiveCategories(samplePois, ALL_ACTIVE)).toHaveLength(6);
  });

  it("returns an empty array when the input is empty", () => {
    expect(filterByActiveCategories([], ALL_ACTIVE)).toHaveLength(0);
  });

  it("returns no POIs when all categories are inactive", () => {
    const noneActive = Object.fromEntries(POI_CATEGORIES.map((c) => [c, false])) as Record<
      PoiCategory,
      boolean
    >;
    expect(filterByActiveCategories(samplePois, noneActive)).toHaveLength(0);
  });

  it("excludes all POIs for a toggled-off category, including duplicates", () => {
    const filter = { ...ALL_ACTIVE, food_drink: false };
    const result = filterByActiveCategories(samplePois, filter);
    expect(result).toHaveLength(4);
    expect(result.every((p) => p.category !== "food_drink")).toBe(true);
  });

  it("restores all POIs when a category is toggled back on", () => {
    const withoutFood = { ...ALL_ACTIVE, food_drink: false };
    const withFood = { ...withoutFood, food_drink: true };
    expect(filterByActiveCategories(samplePois, withoutFood)).toHaveLength(4);
    expect(filterByActiveCategories(samplePois, withFood)).toHaveLength(6);
  });

  it("can filter to a single category", () => {
    const onlyFood = Object.fromEntries(
      POI_CATEGORIES.map((c) => [c, c === "food_drink"]),
    ) as Record<PoiCategory, boolean>;
    const result = filterByActiveCategories(samplePois, onlyFood);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.category === "food_drink")).toBe(true);
  });
});

describe("isPoiCategory", () => {
  it("returns true for every valid category", () => {
    for (const category of POI_CATEGORIES) {
      expect(isPoiCategory(category)).toBe(true);
    }
  });

  it("returns false for an arbitrary string", () => {
    expect(isPoiCategory("restaurants")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isPoiCategory("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPoiCategory(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPoiCategory(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isPoiCategory(42)).toBe(false);
  });
});
