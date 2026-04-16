import { forwardRef, useImperativeHandle, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { broadcastPresence, ActivePresence, VisibilityType } from "@/lib/presence";

export type BroadcastModalHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  poiId: string;
  onSubmitted: (presence: ActivePresence) => void;
};

export const BroadcastModal = forwardRef<BroadcastModalHandle, Props>(function BroadcastModal(
  { poiId, onSubmitted },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [visibleTo, setVisibleTo] = useState<VisibilityType>("friends");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      setMessage("");
      setVisibleTo("friends");
      setError(null);
      setVisible(true);
    },
    dismiss: () => setVisible(false),
  }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const presence = await broadcastPresence(supabase, {
        poiId,
        message,
        visibleTo,
      });
      onSubmitted(presence);
      setVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) setVisible(false);
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!submitting) setVisible(false);
          }}
        />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>I'm here</Text>
            <Text style={styles.subtitle}>Let people know you're around</Text>
          </View>

          {/* Message input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="What are you up to?"
              placeholderTextColor="#C0BDB8"
              multiline
              maxLength={140}
              value={message}
              onChangeText={setMessage}
            />
            <Text style={styles.charCount}>{message.length}/140</Text>
          </View>

          {/* Visibility toggle */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, visibleTo === "friends" && styles.segmentActive]}
              onPress={() => setVisibleTo("friends")}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.segmentText, visibleTo === "friends" && styles.segmentTextActive]}
              >
                Friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, visibleTo === "community" && styles.segmentActive]}
              onPress={() => setVisibleTo("community")}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.segmentText, visibleTo === "community" && styles.segmentTextActive]}
              >
                Community
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting ? styles.submitDisabled : styles.submitActive]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>I'm here</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    width: "88%",
    backgroundColor: "#FAFAF8",
    borderRadius: 24,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    gap: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#131313",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#AAAAAA",
    fontWeight: "400",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#EDECEA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 32,
    fontSize: 15,
    color: "#131313",
    minHeight: 90,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    lineHeight: 22,
  },
  charCount: {
    position: "absolute",
    bottom: 10,
    right: 14,
    fontSize: 11,
    color: "#CCCCCC",
    fontWeight: "500",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EDECEA",
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  segmentActive: {
    backgroundColor: "#131313",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#131313",
    letterSpacing: 0.1,
  },
  segmentTextActive: {
    color: "#fff",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorIcon: {
    fontSize: 13,
    color: "#E51E1E",
  },
  error: {
    color: "#E51E1E",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
  },
  submitActive: {
    backgroundColor: "#131313",
  },
  submitDisabled: {
    backgroundColor: "#EDECEA",
  },
  submitText: {
    fontWeight: "700",
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.1,
  },
});
