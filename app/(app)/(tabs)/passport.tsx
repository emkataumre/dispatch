import { useLayoutEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";

export default function PassportScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { signOut } = useAuth();

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
    <View style={styles.container}>
      <Text style={styles.text}>Passport — coming in Phase 6</Text>
      <Pressable onPress={signOut}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 16, color: "#999", marginBottom: 24 },
  headerButton: { marginRight: 16 },
  signOut: { color: "#FF3B30", fontSize: 16 },
});
