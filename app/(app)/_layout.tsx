import { useEffect } from "react";
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
  const { newBadge, dismiss } = useNewBadges();

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
    </BottomSheetModalProvider>
  );
}
