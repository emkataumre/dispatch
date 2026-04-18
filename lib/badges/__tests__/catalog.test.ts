import { BADGE_CATALOG, BADGE_BY_ID, type BadgeCategory, type BadgeDefinition } from "../catalog";

// ---------------------------------------------------------------------------
// Expected badge IDs — exhaustive list. Adding/removing a badge without
// updating this test is a deliberate breaking change.
// ---------------------------------------------------------------------------
const EXPECTED_IDS: readonly string[] = [
  // Milestones
  "first_step",
  "getting_started",
  "semester_regular",
  "copenhagen_veteran",
  // Exploration
  "cartographer",
  "all_five",
  "local_secret",
  // Loyalty
  "regular",
  "this_is_my_table",
  // Time & Rhythm
  "night_owl",
  "early_bird",
  "weekend_warrior",
  // POI Category
  "bookworm",
  "culture_vulture",
  "foodie",
  "nightlifer",
  // Social
  "social_butterfly",
  "connector",
  "come_join_me",
  // Exclusive
  "pioneer",
];

const VALID_CATEGORIES: readonly BadgeCategory[] = [
  "milestone",
  "exploration",
  "loyalty",
  "time",
  "poi_category",
  "social",
  "exclusive",
];

describe("BADGE_CATALOG — completeness", () => {
  it("contains exactly 20 badges", () => {
    expect(BADGE_CATALOG.length).toBe(20);
  });

  it("catalog IDs match expected IDs exactly (both directions)", () => {
    expect(BADGE_CATALOG.map((b) => b.id).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("has no duplicate IDs", () => {
    const ids = BADGE_CATALOG.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("BADGE_CATALOG — field integrity", () => {
  it.each(BADGE_CATALOG as unknown as BadgeDefinition[])(
    "$id has all required non-empty fields",
    (badge) => {
      expect(typeof badge.id).toBe("string");
      expect(badge.id.length).toBeGreaterThan(0);

      expect(typeof badge.name).toBe("string");
      expect(badge.name.length).toBeGreaterThan(0);

      expect(typeof badge.description).toBe("string");
      expect(badge.description.length).toBeGreaterThan(0);

      expect(typeof badge.criteriaHint).toBe("string");
      expect(badge.criteriaHint.length).toBeGreaterThan(0);

      expect(typeof badge.icon).toBe("string");
      expect(badge.icon.length).toBeGreaterThan(0);

      expect(VALID_CATEGORIES).toContain(badge.category);
    },
  );

  it("badge IDs use only lowercase letters and underscores", () => {
    for (const badge of BADGE_CATALOG) {
      expect(badge.id).toMatch(/^[a-z_]+$/);
    }
  });
});

describe("BADGE_CATALOG — Pioneer", () => {
  it("Pioneer badge exists and is exclusive", () => {
    const pioneer = BADGE_BY_ID.get("pioneer");
    expect(pioneer).toBeDefined();
    expect(pioneer?.category).toBe("exclusive");
  });

  it("Pioneer criteriaHint mentions auto-award on signup", () => {
    const pioneer = BADGE_BY_ID.get("pioneer");
    expect(pioneer?.criteriaHint.toLowerCase()).toMatch(/\bautomatic(ally)?\b|\bsign[- ]?up\b/);
  });
});

describe("BADGE_BY_ID — lookup map", () => {
  it("has same size as catalog", () => {
    expect(BADGE_BY_ID.size).toBe(BADGE_CATALOG.length);
  });

  it("resolves every catalog ID to its definition", () => {
    for (const badge of BADGE_CATALOG) {
      const found = BADGE_BY_ID.get(badge.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe(badge.name);
    }
  });

  it("returns undefined for unknown badge ID", () => {
    expect(BADGE_BY_ID.get("not_a_real_badge")).toBeUndefined();
  });
});
