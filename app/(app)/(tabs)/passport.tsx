import { useState, useLayoutEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { usePassportStats } from "@/hooks/usePassportStats";
import { useUserBadges } from "@/hooks/useUserBadges";
import { BADGE_CATALOG, type BadgeDefinition } from "@/lib/badges/catalog";
import { StatCard } from "@/components/passport/StatCard";
import { BadgeCell } from "@/components/passport/BadgeCell";
import { BadgeDetailModal } from "@/components/passport/BadgeDetailModal";

export default function PassportScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const stats = usePassportStats();
  const badges = useUserBadges();

  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/(app)/profile-modal")} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={22} color="#0066FF" />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="passport-screen"
      >
        {/* ── Stats section ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>This Semester</Text>

        {stats.isLoading ? (
          <ActivityIndicator
            size="small"
            color="#131313"
            style={styles.loader}
            testID="stats-loading"
          />
        ) : (
          <>
            {stats.error && (
              <Text style={styles.errorText} testID="stats-error">
                {stats.error}
              </Text>
            )}

            <View style={styles.statsRow}>
              <StatCard
                label="Check-ins"
                value={stats.totalCheckIns}
                testID="stat-total-check-ins"
              />
              <View style={styles.statGap} />
              <StatCard label="Places Visited" value={stats.uniquePois} testID="stat-unique-pois" />
            </View>

            <StatCard
              label="Most Visited"
              value={stats.mostVisited?.name ?? "—"}
              compact
              testID="stat-most-visited"
            />
          </>
        )}

        {/* ── Badges section ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, styles.badgesSectionLabel]}>Badges</Text>

        {badges.isLoading ? (
          <ActivityIndicator
            size="small"
            color="#131313"
            style={styles.loader}
            testID="badges-loading"
          />
        ) : (
          <>
            {badges.error && (
              <Text style={styles.errorText} testID="badges-error">
                {badges.error}
              </Text>
            )}
            <Text style={styles.badgesHint}>
              {badges.awardedIds.size} / {BADGE_CATALOG.length} earned
            </Text>
            <View style={styles.badgeGrid} testID="badge-grid">
              {BADGE_CATALOG.map((badge) => (
                <BadgeCell
                  key={badge.id}
                  badge={badge}
                  unlocked={badges.awardedIds.has(badge.id)}
                  onPress={() => setSelectedBadge(badge)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <Pressable onPress={signOut} style={styles.signOutButton} accessibilityRole="button">
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <BadgeDetailModal
        badge={selectedBadge}
        unlocked={selectedBadge != null && badges.awardedIds.has(selectedBadge.id)}
        onClose={() => setSelectedBadge(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  badgesSectionLabel: {
    marginTop: 32,
  },
  badgesHint: {
    fontSize: 13,
    color: "#999",
    marginBottom: 16,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#E51E1E",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  statGap: {
    width: 10,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  headerButton: {
    marginRight: 16,
  },
  signOutButton: {
    marginTop: 32,
    alignSelf: "center",
  },
  signOut: {
    color: "#E51E1E",
    fontSize: 15,
  },
});
