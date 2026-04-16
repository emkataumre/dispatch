import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Mapbox from "@rnmapbox/maps";
import { Tables } from "@/types/supabase";
import { LivePresenceEntry } from "@/hooks/useLivePresences";
import { PresenceBubble } from "./PresenceBubble";

type Poi = Tables<"pois">;

interface Props {
  presences: LivePresenceEntry[];
  pois: Poi[];
  onPoiPress: (poi: Poi) => void;
}

const MAX_VISIBLE = 3;

export function PresenceLayer({ presences, pois, onPoiPress }: Props) {
  const poiById = useMemo(() => new Map(pois.map((p) => [p.id, p])), [pois]);

  const byPoi = useMemo(() => {
    const map = new Map<string, LivePresenceEntry[]>();
    for (const p of presences) {
      const existing = map.get(p.poiId);
      if (existing) {
        existing.push(p);
      } else {
        map.set(p.poiId, [p]);
      }
    }
    return map;
  }, [presences]);

  return (
    <>
      {Array.from(byPoi.entries()).map(([poiId, group]) => {
        const poi = poiById.get(poiId);
        if (!poi) return null;

        const visible = group.slice(0, MAX_VISIBLE);
        const overflow = group.length - MAX_VISIBLE;

        return (
          <Mapbox.MarkerView
            key={poiId}
            id={`presence-${poiId}`}
            coordinate={[poi.lng, poi.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <Pressable onPress={() => onPoiPress(poi)} style={styles.row}>
              {visible.map((entry, i) => (
                <View key={entry.id} style={i > 0 ? styles.overlap : undefined}>
                  <PresenceBubble displayName={entry.displayName} avatarUrl={entry.avatarUrl} />
                </View>
              ))}
              {overflow > 0 && (
                <View style={[styles.overlap, styles.overflowPill]}>
                  <Text style={styles.overflowText}>{`+${overflow}`}</Text>
                </View>
              )}
            </Pressable>
          </Mapbox.MarkerView>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  overlap: {
    marginLeft: -10,
  },
  overflowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  overflowText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
