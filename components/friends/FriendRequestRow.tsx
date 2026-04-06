import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { UserAvatar } from '@/components/UserAvatar'
import { IncomingRequestEntry } from '@/hooks/useFriendships'

interface Props {
  entry: IncomingRequestEntry
  onAccept: () => Promise<void>
  onDecline: () => Promise<void>
}

export function FriendRequestRow({ entry, onAccept, onDecline }: Props) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)

  const handleAccept = async () => {
    if (busy) return
    setBusy('accept')
    try {
      await onAccept()
    } catch (err) {
      console.error('FriendRequestRow accept:', err)
      Alert.alert('Error', 'Could not accept request. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const handleDecline = async () => {
    if (busy) return
    setBusy('decline')
    try {
      await onDecline()
    } catch (err) {
      console.error('FriendRequestRow decline:', err)
      Alert.alert('Error', 'Could not decline request. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
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
        style={styles.declineButton}
        onPress={handleDecline}
        disabled={busy !== null}
        activeOpacity={0.8}
      >
        {busy === 'decline' ? (
          <ActivityIndicator size="small" color="#666" />
        ) : (
          <Text style={styles.declineText}>Decline</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.acceptButton}
        onPress={handleAccept}
        disabled={busy !== null}
        activeOpacity={0.8}
      >
        {busy === 'accept' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.acceptText}>Accept</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  declineButton: {
    borderWidth: 1,
    borderColor: '#d1d1d1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 68,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    backgroundColor: '#131313',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 68,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
})
