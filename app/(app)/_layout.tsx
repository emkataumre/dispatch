import { Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";
import { useNewBadges } from "@/hooks/useNewBadges";
import { CheckInToast } from "@/components/CheckInToast";
import { BadgeUnlockToast } from "@/components/BadgeUnlockToast";

export default function AppLayout() {
  const { toast } = useGeofenceNotifications();
  const { newBadge, dismiss } = useNewBadges();

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
