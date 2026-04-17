import { Pressable, Text, StyleSheet } from "react-native";
import type { BadgeDefinition } from "@/lib/badges/catalog";

type Props = {
  badge: BadgeDefinition;
  /** When false (default) the cell renders in locked/greyed state. */
  unlocked?: boolean;
  onPress: () => void;
};

export function BadgeCell({ badge, unlocked = false, onPress }: Props) {
  return (
    <Pressable
      style={styles.cell}
      onPress={onPress}
      testID={`badge-cell-${badge.id}`}
      accessibilityLabel={unlocked ? badge.name : `${badge.name} (locked)`}
    >
      <Text style={[styles.icon, !unlocked && styles.iconLocked]}>{badge.icon}</Text>
      <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  icon: {
    fontSize: 30,
    marginBottom: 6,
  },
  iconLocked: {
    opacity: 0.25,
  },
  name: {
    fontSize: 10,
    fontWeight: "600",
    color: "#131313",
    textAlign: "center",
    lineHeight: 14,
  },
  nameLocked: {
    color: "#C0C0C0",
  },
});
