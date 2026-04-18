/**
 * V1 badge catalog — data only, no award logic.
 *
 * STABILITY INVARIANT: Badge `id` values are the primary key used by the badge
 * engine and stored in the database. Once a badge ships to production, its `id`
 * MUST NOT change. Rename the display `name` freely; never rename the `id`.
 *
 * `icon` fields are emoji placeholders. Replace with Supabase Storage URLs when
 * badge assets are uploaded (Phase 6 criteria engine).
 *
 * `criteriaHint` is human-readable copy shown in BadgeDetailModal ("How to earn").
 * Exact numeric thresholds are intentionally absent here — they live in the
 * criteria engine, not in this data file.
 */

export type BadgeCategory =
  | "milestone"
  | "exploration"
  | "loyalty"
  | "time"
  | "poi_category"
  | "social"
  | "exclusive";

export type BadgeDefinition = {
  /** Stable slug. Never change after first production deploy. */
  id: string;
  name: string;
  description: string;
  /** Plain-English "How to earn" copy shown in the locked badge modal. */
  criteriaHint: string;
  category: BadgeCategory;
  /** Emoji placeholder — will be replaced by a Supabase Storage URL. */
  icon: string;
};

// ---------------------------------------------------------------------------
// V1 catalog — 20 badges
// ---------------------------------------------------------------------------

// `as const satisfies BadgeDefinition[]` makes every property readonly at the
// type level, enforcing the id-stability invariant promised in the file header.
export const BADGE_CATALOG = [
  // ── Milestones ────────────────────────────────────────────────────────────
  {
    id: "first_step",
    name: "First Step",
    description: "Your journey begins.",
    criteriaHint: "Check in to a place for the first time.",
    category: "milestone",
    icon: "👣",
  },
  {
    id: "getting_started",
    name: "Getting Started",
    description: "Building momentum across the city.",
    criteriaHint: "Rack up your first handful of check-ins.",
    category: "milestone",
    icon: "🚀",
  },
  {
    id: "semester_regular",
    name: "Semester Regular",
    description: "A familiar face in Copenhagen.",
    criteriaHint: "Check in consistently across the semester.",
    category: "milestone",
    icon: "🏅",
  },
  {
    id: "copenhagen_veteran",
    name: "Copenhagen Veteran",
    description: "You've covered serious ground.",
    criteriaHint: "Reach the highest check-in milestone of the semester.",
    category: "milestone",
    icon: "🏆",
  },

  // ── Exploration ───────────────────────────────────────────────────────────
  {
    id: "cartographer",
    name: "Cartographer",
    description: "No corner of the map left unvisited.",
    criteriaHint: "Check in to many different places across the city.",
    category: "exploration",
    icon: "🗺️",
  },
  {
    id: "all_five",
    name: "All Five",
    description: "Sampled everything Copenhagen has to offer.",
    criteriaHint: "Visit all five place categories.",
    category: "exploration",
    icon: "⭐",
  },
  {
    id: "local_secret",
    name: "Local Secret",
    description: "You found somewhere the tourists don't know about.",
    criteriaHint: "Check in to a spot with very few community visits.",
    category: "exploration",
    icon: "🔍",
  },

  // ── Loyalty ───────────────────────────────────────────────────────────────
  {
    id: "regular",
    name: "Regular",
    description: "They know your name here.",
    criteriaHint: "Return to the same place multiple times.",
    category: "loyalty",
    icon: "☕",
  },
  {
    id: "this_is_my_table",
    name: "This Is My Table",
    description: "Claimed your spot.",
    criteriaHint: "Become the most frequent visitor at a place in your cohort.",
    category: "loyalty",
    icon: "🪑",
  },

  // ── Time & Rhythm ─────────────────────────────────────────────────────────
  {
    id: "night_owl",
    name: "Night Owl",
    description: "The city looks different after dark.",
    criteriaHint: "Check in somewhere after midnight.",
    category: "time",
    icon: "🦉",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Copenhagen at dawn is something else.",
    criteriaHint: "Check in somewhere before 8 am.",
    category: "time",
    icon: "🌅",
  },
  {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Saturday and Sunday belong to you.",
    criteriaHint: "Check in on a weekend.",
    category: "time",
    icon: "🎉",
  },

  // ── POI Category ──────────────────────────────────────────────────────────
  {
    id: "bookworm",
    name: "Bookworm",
    description: "Cafés, bookshops, and good coffee.",
    criteriaHint: "Check in to multiple places in the café & bookshop category.",
    category: "poi_category",
    icon: "📚",
  },
  {
    id: "culture_vulture",
    name: "Culture Vulture",
    description: "Museums, galleries, and everything in between.",
    criteriaHint: "Check in to multiple cultural spots.",
    category: "poi_category",
    icon: "🎨",
  },
  {
    id: "foodie",
    name: "Foodie",
    description: "Copenhagen's food scene, fully explored.",
    criteriaHint: "Check in to multiple restaurants and food spots.",
    category: "poi_category",
    icon: "🍽️",
  },
  {
    id: "nightlifer",
    name: "Nightlifer",
    description: "Bars, clubs, and late-night venues.",
    criteriaHint: "Check in to multiple nightlife spots.",
    category: "poi_category",
    icon: "🎶",
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Always where the people are.",
    criteriaHint: "Join other people's broadcasts multiple times.",
    category: "social",
    icon: "🦋",
  },
  {
    id: "connector",
    name: "Connector",
    description: "You bring people to the places you love.",
    criteriaHint: "Have multiple people join your broadcasts.",
    category: "social",
    icon: "🤝",
  },
  {
    id: "come_join_me",
    name: "Come Join Me",
    description: "The squad showed up.",
    criteriaHint: "Have someone join your broadcast and actually arrive at the spot.",
    category: "social",
    icon: "📍",
  },

  // ── Exclusive ─────────────────────────────────────────────────────────────
  {
    id: "pioneer",
    name: "Pioneer",
    description: "One of the very first.",
    criteriaHint: "Be part of the Summer 2026 cohort — awarded automatically on signup.",
    category: "exclusive",
    icon: "🌟",
  },
] as const satisfies ReadonlyArray<Readonly<BadgeDefinition>>;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** O(1) lookup by badge id. Built once at module load. */
export const BADGE_BY_ID = new Map(
  BADGE_CATALOG.map((b) => [b.id, b as BadgeDefinition]),
) as ReadonlyMap<string, BadgeDefinition>;
