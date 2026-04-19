import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";
import { useNewBadges } from "@/hooks/useNewBadges";
import { CheckInToast } from "@/components/CheckInToast";
import { BadgeUnlockToast } from "@/components/BadgeUnlockToast";
import { registerForPushNotifications } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export default function AppLayout() {
  const { toast } = useGeofenceNotifications();
  const { newBadge, realtimeError, dismiss } = useNewBadges();
  const errorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(errorOpacity, {
      toValue: realtimeError ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [realtimeError, errorOpacity]);

  useEffect(() => {
    // Register on cold-start (covers existing session) AND on every SIGNED_IN
    // / TOKEN_REFRESHED. Without the auth listener, an account-switch within
    // a single layout-mount would leave the new user's token unregistered.
    // Fire-and-forget — failure is non-fatal and logged inside the function.
    registerForPushNotifications();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        registerForPushNotifications();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <BottomSheetModalProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile-modal"
          options={{ presentation: "modal", title: "Edit Profile" }}
        />
      </Stack>
      <CheckInToast visible={toast.visible} message={toast.message} />
      <BadgeUnlockToast badge={newBadge} onDismiss={dismiss} />
      <Animated.View
        style={[styles.realtimeError, { opacity: errorOpacity, pointerEvents: "none" }]}
      >
        <Text style={styles.realtimeErrorText}>{realtimeError}</Text>
      </Animated.View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  realtimeError: {
    position: "absolute",
    bottom: 56,
    alignSelf: "center",
    backgroundColor: "rgba(19,19,19,0.85)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  realtimeErrorText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});
