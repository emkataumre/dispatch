import { Database } from "@/types/supabase";

export type PoiCategory = Database["public"]["Enums"]["poi_category"];

export const POI_CATEGORIES: PoiCategory[] = [
  "food_drink",
  "nightlife",
  "culture",
  "study_spots",
  "hidden_gems",
];

export const CATEGORY_LABELS: Record<PoiCategory, string> = {
  food_drink: "Food & Drink",
  nightlife: "Nightlife",
  culture: "Culture",
  study_spots: "Study Spots",
  hidden_gems: "Hidden Gems",
};

export const CATEGORY_COLORS: Record<PoiCategory, string> = {
  food_drink: "#FF8C00",
  nightlife: "#7B2FBE",
  culture: "#0066FF",
  study_spots: "#2D8A4E",
  hidden_gems: "#E51E1E",
};

export function isPoiCategory(value: unknown): value is PoiCategory {
  return POI_CATEGORIES.includes(value as PoiCategory);
}
