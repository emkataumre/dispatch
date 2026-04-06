import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { UserAvatar } from '@/components/UserAvatar'
import { SearchUser } from '@/lib/friends'
import { FriendshipStatus } from '@/lib/friendships'

interface Props {
  user: SearchUser
  status: FriendshipStatus
  onSendRequest: () => Promise<void>
  onCancelRequest: () => Promise<void>
  onAcceptRequest: () => Promise<void>
}

export function UserSearchResult({ user, status, onSendRequest, onCancelRequest, onAcceptRequest }: Props) {
  const [busy, setBusy] = useState(false)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const handlePress = async () => {
    if (busy) return

    if (status === 'none') {
      setBusy(true)
      setRowError(null)
      try {
        await onSendRequest()
      } catch (err) {
        console.error('UserSearchResult sendRequest:', err)
        setRowError('Could not send friend request. Try again.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (status === 'pending_sent') {
      setCancelModalVisible(true)
      return
    }

    if (status === 'pending_received') {
      setBusy(true)
      setRowError(null)
      try {
        await onAcceptRequest()
      } catch (err) {
        console.error('UserSearchResult acceptRequest:', err)
        setRowError('Could not accept request. Try again.')
      } finally {
        setBusy(false)
      }
    }
  }

  const handleConfirmCancel = async () => {
    setBusy(true)
    setModalError(null)
    try {
      await onCancelRequest()
      setCancelModalVisible(false)
    } catch (err) {
      console.error('UserSearchResult cancelRequest:', err)
      setModalError('Could not cancel request. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const buttonConfig = getButtonConfig(status)

  return (
    <>
      <View>
      <View style={styles.row}>
        <UserAvatar
          displayName={user.display_name}
          avatarUrl={user.avatar_url}
          size={40}
          borderWidth={0}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{user.display_name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, buttonConfig.buttonStyle]}
          onPress={handlePress}
          disabled={busy || status === 'accepted'}
          activeOpacity={0.8}
        >
          {busy ? (
            <ActivityIndicator size="small" color={buttonConfig.spinnerColor} />
          ) : (
            <Text style={[styles.buttonText, buttonConfig.textStyle]}>{buttonConfig.label}</Text>
          )}
        </TouchableOpacity>
      </View>
      {rowError ? <Text style={styles.rowErrorText}>{rowError}</Text> : null}
      </View>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!busy) setCancelModalVisible(false) }}
      >
        <Pressable style={styles.backdrop} onPress={() => { if (!busy) setCancelModalVisible(false) }} />
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Cancel request?</Text>
            <Text style={styles.subtitle}>{user.display_name} won't be notified.</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.destructiveButton]}
              onPress={handleConfirmCancel}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.destructiveText}>Cancel request</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setCancelModalVisible(false)}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Keep</Text>
            </TouchableOpacity>

            {modalError ? <Text style={styles.modalErrorText}>{modalError}</Text> : null}
          </View>
        </View>
      </Modal>
    </>
  )
}

type ButtonConfig = {
  label: string
  buttonStyle: object
  textStyle: object
  spinnerColor: string
}

function getButtonConfig(status: FriendshipStatus): ButtonConfig {
  switch (status) {
    case 'none':
      return {
        label: 'Add Friend',
        buttonStyle: styles.buttonDark,
        textStyle: styles.textLight,
        spinnerColor: '#fff',
      }
    case 'pending_sent':
      return {
        label: 'Pending',
        buttonStyle: styles.buttonGrey,
        textStyle: styles.textDark,
        spinnerColor: '#131313',
      }
    case 'pending_received':
      return {
        label: 'Accept',
        buttonStyle: styles.buttonBlue,
        textStyle: styles.textLight,
        spinnerColor: '#fff',
      }
    case 'accepted':
      return {
        label: 'Friends',
        buttonStyle: styles.buttonOutline,
        textStyle: styles.textMuted,
        spinnerColor: '#999',
      }
  }
}

const styles = StyleSheet.create({
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
  modalButton: {
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
  button: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDark: {
    backgroundColor: '#131313',
  },
  buttonGrey: {
    backgroundColor: '#e5e5e5',
  },
  buttonBlue: {
    backgroundColor: '#0066FF',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#d1d1d1',
  },
  textLight: {
    color: '#fff',
  },
  textDark: {
    color: '#131313',
  },
  textMuted: {
    color: '#999',
  },
  rowErrorText: {
    fontSize: 12,
    color: '#E51E1E',
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  modalErrorText: {
    fontSize: 13,
    color: '#E51E1E',
    fontWeight: '500',
    textAlign: 'center',
  },
})
