import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  StyleSheet,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Tables } from "@/types/supabase";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/poiCategories";
import { usePoiRatings, RatingComment } from "@/hooks/usePoiRatings";
import {
  PoiRatingModal,
  PoiRatingModalHandle,
} from "@/components/map/PoiRatingModal";
import {
  BroadcastModal,
  BroadcastModalHandle,
} from "@/components/map/BroadcastModal";
import { PresenceCard } from "@/components/map/PresenceCard";
import { UserAvatar } from "@/components/UserAvatar";
import { useProximity } from "@/hooks/useProximity";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { dismissPresence, ActivePresence } from "@/lib/presence";
import { LivePresenceEntry } from "@/hooks/useLivePresences";
import { PresenceJoin, confirmJoins } from "@/lib/presenceJoins";

type Poi = Tables<"pois">;

type Props = {
  poi: Poi | null;
  onClose: () => void;
  activePresence: ActivePresence | null;
  onBroadcast: (presence: ActivePresence) => void;
  onDismissBroadcast: () => void;
  locationGranted: boolean;
  presences: LivePresenceEntry[];
  getJoinForPresence: (presenceId: string) => PresenceJoin | undefined;
  onJoinPresence: (presenceId: string) => Promise<PresenceJoin | void>;
  onCancelJoin: (joinId: string) => Promise<void>;
};

// Category emoji icons for extra character
const CATEGORY_ICONS: Record<string, string> = {
  food_drink: "🍜",
  nightlife: "🎶",
  culture: "🏛️",
  study_spots: "📖",
  hidden_gems: "💎",
};

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[styles.star, { fontSize: size }]}>
          {i <= Math.round(rating) ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

function CommentRow({ item }: { item: RatingComment }) {
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentLeft}>
        <UserAvatar
          displayName={item.display_name}
          avatarUrl={item.avatar_url}
          size={34}
          borderWidth={0}
        />
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.display_name}</Text>
          <View style={styles.commentMeta}>
            <Stars rating={item.rating} size={11} />
            <Text style={styles.commentDate}>{date}</Text>
          </View>
        </View>
        {item.comment ? (
          <Text style={styles.commentText}>{item.comment}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function PoiBottomSheet({
  poi,
  onClose,
  activePresence,
  onBroadcast,
  onDismissBroadcast,
  locationGranted,
  presences,
  getJoinForPresence,
  onJoinPresence,
  onCancelJoin,
}: Props) {
  const [dismissing, setDismissing] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const snapPoints = useMemo(() => ["82%", "100%"], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const ratingModalRef = useRef<PoiRatingModalHandle>(null);
  const broadcastModalRef = useRef<BroadcastModalHandle>(null);
  const { session } = useAuth();
  const { avgRating, ratingCount, comments, myRating, refetch } = usePoiRatings(
    poi?.id,
  );
  const { isNearby } = useProximity(
    locationGranted && poi ? { lat: poi.lat, lng: poi.lng } : null
  );
  const poiPresences = useMemo(
    () => presences.filter((p) => p.poiId === poi?.id),
    [presences, poi?.id]
  );

  // Drive open/close imperatively so that a swipe-down (which calls onClose → clears poi)
  // doesn't trigger a redundant second programmatic close on an already-closing sheet.
  useEffect(() => {
    if (poi) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [poi]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.35}
      />
    ),
    [],
  );

  const handleGetDirections = useCallback(() => {
    if (!poi) return;
    const url =
      Platform.OS === "ios"
        ? `maps://maps.apple.com/?ll=${poi.lat},${poi.lng}&q=${encodeURIComponent(poi.name)}`
        : `geo:${poi.lat},${poi.lng}?q=${poi.lat},${poi.lng}(${encodeURIComponent(poi.name)})`;
    Linking.openURL(url);
  }, [poi]);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  // If the joiner is already at the POI when they tap "Joining", no geofence
  // ENTER event will fire (they're already inside). Auto-confirm immediately.
  const handleJoin = useCallback(
    async (presenceId: string): Promise<PresenceJoin | void> => {
      const result = await onJoinPresence(presenceId)
      if (result && isNearby && poi?.id) {
        try {
          await confirmJoins(supabase, { poiId: poi.id })
        } catch (err) {
          console.error('[PoiBottomSheet] immediate confirmJoins failed:', err)
        }
      }
      return result
    },
    [onJoinPresence, isNearby, poi?.id]
  );

  const categoryColor = poi ? CATEGORY_COLORS[poi.category] : "#999";
  const categoryLabel = poi ? CATEGORY_LABELS[poi.category] : "";
  const categoryIcon = poi ? CATEGORY_ICONS[poi.category] ?? "" : "";

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleChange}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item: RatingComment) => item.id}
          renderItem={({ item }: { item: RatingComment }) => (
            <CommentRow item={item} />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Tappable area: badge + name + rating → expands sheet */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => bottomSheetRef.current?.snapToIndex(1)}
              >
                {/* Category badge */}
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: categoryColor + "18",
                      borderColor: categoryColor + "40",
                    },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{categoryIcon}</Text>
                  <Text style={[styles.categoryLabel, { color: categoryColor }]}>
                    {categoryLabel}
                  </Text>
                </View>

                {/* POI name */}
                <Text style={styles.poiName}>{poi?.name}</Text>

                {/* Rating summary */}
                <View style={styles.ratingRow}>
                  {avgRating !== null ? (
                    <>
                      <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
                      <Stars rating={avgRating} size={15} />
                      <Text style={styles.ratingCount}>
                        {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noRatings}>No reviews yet — be the first!</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={handleGetDirections}
                  activeOpacity={0.85}
                >
                  <Text style={styles.directionsIcon}>↗</Text>
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>

                {myRating ? (
                  <View style={styles.ratedRow}>
                    <Text style={styles.ratedText}>Your rating</Text>
                    <Stars rating={myRating.rating} size={15} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => {
                      bottomSheetRef.current?.snapToIndex(1);
                      ratingModalRef.current?.present();
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.reviewIcon}>✦</Text>
                    <Text style={styles.reviewButtonText}>Leave a Review</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* I'm here / Leave button */}
              {(() => {
                if (!poi) return null;
                const hasActiveBroadcastHere = activePresence?.poi_id === poi.id;

                if (hasActiveBroadcastHere) {
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.leaveButton, dismissing && styles.leaveButtonDimmed]}
                        activeOpacity={0.85}
                        disabled={dismissing}
                        onPress={async () => {
                          setDismissing(true);
                          setDismissError(null);
                          try {
                            await dismissPresence(supabase, { presenceId: activePresence!.id });
                            onDismissBroadcast();
                          } catch (err) {
                            console.error('dismissPresence failed:', err)
                            setDismissError('Could not end broadcast. Try again.');
                          } finally {
                            setDismissing(false);
                          }
                        }}
                      >
                        <Text style={styles.leaveButtonText}>Leave</Text>
                      </TouchableOpacity>
                      {dismissError ? <Text style={styles.dismissErrorText}>{dismissError}</Text> : null}
                    </>
                  );
                }

                if (!isNearby) {
                  return (
                    <View style={styles.imHereButtonDisabled}>
                      <Text style={styles.imHereButtonDisabledText}>Get closer to broadcast</Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    style={styles.imHereButton}
                    activeOpacity={0.85}
                    onPress={() => broadcastModalRef.current?.present()}
                  >
                    <Text style={styles.imHereButtonText}>📍 I'm here</Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Who's here */}
              {poiPresences.length > 0 && (
                <>
                  <View style={styles.whosHereLabel}>
                    <Text style={styles.whosHereLabelText}>
                      {poiPresences.length}{" "}
                      {poiPresences.length === 1 ? "Person" : "People"} here
                    </Text>
                  </View>
                  {poiPresences.map((p) => (
                    <PresenceCard
                      key={p.id}
                      presence={p}
                      existingJoin={getJoinForPresence(p.id)}
                      onJoin={handleJoin}
                      onCancel={onCancelJoin}
                      isOwnPresence={p.userId === session?.user.id}
                    />
                  ))}
                </>
              )}

              {/* Comments section label */}
              <View style={styles.commentsLabel}>
                <Text style={styles.commentsLabelText}>
                  {comments.length > 0
                    ? `${comments.length} ${comments.length === 1 ? "Comment" : "Comments"}`
                    : "Comments"}
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyComments}>No comments yet</Text>
              <Text style={styles.emptySubtext}>
                Share what you think of this place
              </Text>
            </View>
          }
        />
      </BottomSheet>

      {poi && (
        <PoiRatingModal
          ref={ratingModalRef}
          poiId={poi.id}
          onSubmitted={refetch}
        />
      )}

      {poi && (
        <BroadcastModal
          ref={broadcastModalRef}
          poiId={poi.id}
          onSubmitted={onBroadcast}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FAFAF8",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    backgroundColor: "#D4D4CF",
    borderRadius: 2,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 5,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  poiName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#131313",
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 7,
  },
  ratingScore: {
    fontSize: 17,
    fontWeight: "800",
    color: "#131313",
    letterSpacing: -0.3,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    color: "#F5A623",
  },
  ratingCount: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  noRatings: {
    fontSize: 14,
    color: "#AAA",
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#EDECEA",
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#131313",
    borderRadius: 14,
    paddingVertical: 13,
    gap: 7,
  },
  directionsIcon: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  directionsButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.1,
  },
  reviewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D4D4CF",
    borderRadius: 14,
    paddingVertical: 13,
    gap: 7,
    backgroundColor: "#fff",
  },
  reviewIcon: {
    color: "#F5A623",
    fontSize: 13,
  },
  reviewButtonText: {
    color: "#131313",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.1,
  },
  ratedRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#FFF8EC",
    borderWidth: 1.5,
    borderColor: "#F5A62330",
  },
  ratedText: {
    color: "#7A6030",
    fontSize: 13,
    fontWeight: "600",
  },
  imHereButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131313',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  imHereButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  imHereButtonDisabled: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDECEA',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  imHereButtonDisabledText: {
    color: '#AAAAAA',
    fontWeight: '600',
    fontSize: 14,
  },
  leaveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F1',
    borderWidth: 1.5,
    borderColor: '#E51E1E30',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  leaveButtonText: {
    color: '#E51E1E',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  leaveButtonDimmed: {
    opacity: 0.5,
  },
  dismissErrorText: {
    fontSize: 12,
    color: '#E51E1E',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  whosHereLabel: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  whosHereLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#AAAAAA",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  commentsLabel: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#AAAAAA",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  commentRow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#EDECEA",
    gap: 12,
  },
  commentLeft: {
    paddingTop: 1,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  commentAuthor: {
    fontWeight: "700",
    fontSize: 14,
    color: "#131313",
    flex: 1,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentDate: {
    fontSize: 11,
    color: "#BBBBBB",
    fontWeight: "500",
  },
  commentText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emptyComments: {
    fontSize: 15,
    fontWeight: "600",
    color: "#AAAAAA",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#CCCCCC",
  },
});
