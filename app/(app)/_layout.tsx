import { Stack } from 'expo-router'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'

export default function AppLayout() {
  return (
    <BottomSheetModalProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile-modal"
          options={{ presentation: 'modal', title: 'Edit Profile' }}
        />
      </Stack>
    </BottomSheetModalProvider>
  )
}
