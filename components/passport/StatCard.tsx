import { View, Text, StyleSheet } from "react-native";

type Props = {
  label: string;
  value: string | number;
  /** Render value at a smaller font size — use for long text values (e.g. place names). */
  compact?: boolean;
  testID?: string;
};

export function StatCard({ label, value, compact = false, testID }: Props) {
  return (
    <View style={styles.card}>
      <Text
        style={[styles.value, compact && styles.valueCompact]}
        testID={testID}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: "#131313",
    marginBottom: 4,
    textAlign: "center",
  },
  valueCompact: {
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
