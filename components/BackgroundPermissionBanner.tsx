import { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";

type Props = {
  onGranted: () => void;
  onDismiss: () => void;
};

export function BackgroundPermissionBanner({ onGranted, onDismiss }: Props) {
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const handlePress = async () => {
    if (denied) {
      // After denial, guide the user to the OS settings screen.
      Linking.openSettings();
      return;
    }

    setRequesting(true);
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === "granted") {
        onGranted();
      } else {
        setDenied(true);
      }
    } catch (err) {
      console.error("[BackgroundPermissionBanner] request failed:", err);
      setDenied(true);
    } finally {
      setRequesting(false);
    }
  };

  const message = denied
    ? Platform.OS === "ios"
      ? "Go to Settings \u2192 Location \u2192 Always to enable automatic check-ins."
      : 'Open Settings and allow location access "All the time" for automatic check-ins.'
    : "Allow background location to get automatic check-ins when you visit places.";

  const buttonLabel = denied ? "Open Settings" : requesting ? "Requesting..." : "Enable";

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.text}>{message}</Text>
        <View style={styles.actions}>
          <Pressable onPress={handlePress} style={styles.button} disabled={requesting}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.closeButton} hitSlop={8}>
            <Text style={styles.closeText}>{"\u00D7"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: "rgba(19, 19, 19, 0.88)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#131313",
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
});
