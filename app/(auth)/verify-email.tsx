import { View, Text, Pressable, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";

export default function VerifyEmailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📬</Text>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.body}>
        We sent a verification link to your email. Tap it to activate your Dispatch account.
      </Text>
      <Pressable style={styles.link} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.linkText}>Use a different email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 24, marginBottom: 32 },
  link: { padding: 12 },
  linkText: { color: "#0066FF", fontSize: 16 },
});
