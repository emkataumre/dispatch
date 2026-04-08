import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { UserAvatar } from '@/components/UserAvatar'
import { FriendEntry } from '@/hooks/useFriendships'

interface Props {
  entry: FriendEntry
  onUnfriend: () => Promise<void>
}

export function FriendRow({ entry, onUnfriend }: Props) {
  const [modalVisible, setModalVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const handleConfirmUnfriend = async () => {
    setBusy(true)
    setErrorText(null)
    try {
      await onUnfriend()
      setModalVisible(false)
    } catch (err) {
      console.error('FriendRow unfriend:', err)
      setErrorText('Could not unfriend. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <View style={styles.row}>
        <UserAvatar
          displayName={entry.displayName}
          avatarUrl={entry.avatarUrl}
          size={40}
          borderWidth={0}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{entry.displayName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          hitSlop={8}
          accessibilityLabel="Friend options"
        >
          <Text style={styles.menu}>•••</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!busy) setModalVisible(false) }}
      >
        <Pressable style={styles.backdrop} onPress={() => { if (!busy) setModalVisible(false) }} />
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Unfriend {entry.displayName}?</Text>
            <Text style={styles.subtitle}>They won't be notified.</Text>

            <TouchableOpacity
              style={[styles.button, styles.destructiveButton]}
              onPress={handleConfirmUnfriend}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.destructiveText}>Unfriend</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#131313',
  },
  menu: {
    fontSize: 16,
    color: '#666',
    letterSpacing: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '80%',
    backgroundColor: '#FAFAF8',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131313',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
    marginBottom: 4,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  destructiveButton: {
    backgroundColor: '#E51E1E',
  },
  destructiveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#131313',
  },
  errorText: {
    fontSize: 13,
    color: '#E51E1E',
    fontWeight: '500',
    textAlign: 'center',
  },
})
