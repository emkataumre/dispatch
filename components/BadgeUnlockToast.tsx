import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import type { BadgeDefinition } from "@/lib/badges/catalog";

type Props = {
  badge: BadgeDefinition | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 3000;

export function BadgeUnlockToast({ badge, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.timing(opacity, {
      toValue: badge ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (badge) {
      timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [badge, opacity, onDismiss]);

  return (
    <Animated.View style={[styles.container, { opacity, pointerEvents: "none" }]}>
      <Text style={styles.icon}>{badge?.icon ?? ""}</Text>
      <Text style={styles.text}>
        Badge unlocked: <Text style={styles.badgeName}>{badge?.name ?? ""}</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 160,
    left: 24,
    right: 24,
    backgroundColor: "rgba(19, 19, 19, 0.92)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  badgeName: {
    color: "#FFD700",
  },
});
