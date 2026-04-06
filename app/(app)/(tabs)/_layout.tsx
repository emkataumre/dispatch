import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePendingRequestCount } from '@/hooks/usePendingRequestCount'

export default function TabLayout() {
  const pendingCount = usePendingRequestCount()

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0066FF' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: 'Passport',
          tabBarIcon: ({ color }) => <Ionicons name="id-card" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}
