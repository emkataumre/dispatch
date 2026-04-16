import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FriendRequestRow } from "@/components/friends/FriendRequestRow";
import { IncomingRequestEntry } from "@/hooks/useFriendships";

const INITIAL_VISIBLE = 3;

interface Props {
  requests: IncomingRequestEntry[];
  onAccept: (friendshipId: string) => Promise<void>;
  onDecline: (friendshipId: string) => Promise<void>;
}

export function IncomingRequestsSection({ requests, onAccept, onDecline }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (requests.length === 0) return null;

  const visible = expanded ? requests : requests.slice(0, INITIAL_VISIBLE);
  const hiddenCount = requests.length - INITIAL_VISIBLE;

  return (
    <View style={styles.section}>
      {visible.map((entry) => (
        <FriendRequestRow
          key={entry.friendshipId}
          entry={entry}
          onAccept={() => onAccept(entry.friendshipId)}
          onDecline={() => onDecline(entry.friendshipId)}
        />
      ))}
      {!expanded && hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.showMore}
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.showMoreText}>View {hiddenCount} more</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  showMore: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  showMoreText: {
    fontSize: 14,
    color: "#0066FF",
    fontWeight: "600",
  },
});
