import { Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useGeofenceNotifications } from "@/hooks/useGeofenceNotifications";
import { CheckInToast } from "@/components/CheckInToast";

export default function AppLayout() {
  const { toast } = useGeofenceNotifications();

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
    </BottomSheetModalProvider>
  );
}
