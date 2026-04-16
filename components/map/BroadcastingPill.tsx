import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  poiName: string;
  onEnd: () => Promise<void>;
}

export function BroadcastingPill({ poiName, onEnd }: Props) {
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnd = useCallback(async () => {
    if (dismissing) return;
    setError(null);
    setDismissing(true);
    try {
      await onEnd();
    } catch (err) {
      console.error("BroadcastingPill onEnd failed:", err);
      setError("Couldn't end broadcast — try again.");
      setDismissing(false);
    }
  }, [dismissing, onEnd]);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
          At {poiName}
        </Text>
        <Text style={styles.separator}> · </Text>
        <Pressable
          onPress={handleEnd}
          disabled={dismissing}
          hitSlop={8}
          testID="broadcasting-pill-end"
        >
          <Text style={[styles.endLabel, dismissing && styles.endLabelDisabled]}>End</Text>
        </Pressable>
      </View>
      {error && (
        <Text style={styles.errorText} testID="broadcasting-pill-error">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131313",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  separator: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  endLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  endLabelDisabled: {
    opacity: 0.5,
  },
  errorText: {
    marginTop: 6,
    color: "#E51E1E",
    fontSize: 12,
    fontWeight: "600",
  },
});
