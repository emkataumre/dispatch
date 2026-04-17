import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BadgeDefinition } from "@/lib/badges/catalog";

type Props = {
  badge: BadgeDefinition | null;
  /** When false (default) the badge renders in locked state. */
  unlocked?: boolean;
  onClose: () => void;
};

export function BadgeDetailModal({ badge, unlocked = false, onClose }: Props) {
  return (
    <Modal
      visible={badge !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="badge-modal"
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="badge-modal-backdrop">
        {/* Inner Pressable prevents tap-through closing when tapping the card itself */}
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          testID="badge-modal-card"
        >
          {badge !== null && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.cardContent}
            >
              {/* Close button — kept inside card bounds to ensure touch target registers on Android */}
              <Pressable style={styles.closeButton} onPress={onClose} testID="badge-modal-close">
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>

              {/* Icon */}
              <Text style={[styles.icon, !unlocked && styles.iconLocked]}>{badge.icon}</Text>

              {/* Name */}
              <Text style={styles.name}>{badge.name}</Text>

              {/* Status chip */}
              <View style={[styles.chip, unlocked ? styles.chipUnlocked : styles.chipLocked]}>
                <Text
                  style={[
                    styles.chipText,
                    unlocked ? styles.chipTextUnlocked : styles.chipTextLocked,
                  ]}
                >
                  {unlocked ? "Earned" : "Locked"}
                </Text>
              </View>

              {/* Description */}
              <Text style={styles.description}>{badge.description}</Text>

              {/* How to earn */}
              {!unlocked && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintLabel}>How to earn</Text>
                  <Text style={styles.hintText}>{badge.criteriaHint}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "80%",
  },
  cardContent: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 8,
  },
  closeIcon: {
    fontSize: 18,
    color: "#888",
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  iconLocked: {
    opacity: 0.25,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#131313",
    textAlign: "center",
    marginBottom: 10,
  },
  chip: {
    borderRadius: 100,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  chipUnlocked: {
    backgroundColor: "#D4EDDA",
  },
  chipLocked: {
    backgroundColor: "#F0F0F0",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipTextUnlocked: {
    color: "#1A7A35",
  },
  chipTextLocked: {
    color: "#888",
  },
  description: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  hintBox: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
  },
  hintLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
});
