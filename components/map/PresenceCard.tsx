import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LivePresenceEntry } from '@/hooks/useLivePresences'
import { PresenceJoin } from '@/lib/presenceJoins'
import { PresenceBubble } from '@/components/map/PresenceBubble'

type Props = {
  presence: LivePresenceEntry
  existingJoin: PresenceJoin | undefined
  onJoin: (presenceId: string) => Promise<PresenceJoin | void>
  onCancel: (joinId: string) => Promise<void>
  isOwnPresence: boolean
}

export function PresenceCard({ presence, existingJoin, onJoin, onCancel, isOwnPresence }: Props) {
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const firstName = presence.displayName.split(' ')[0]

  const handleJoin = async () => {
    setBusy(true)
    setErrorText(null)
    try {
      await onJoin(presence.id)
    } catch (err) {
      console.error('PresenceCard.handleJoin failed:', err)
      const message = err instanceof Error && err.message.includes('already joined')
        ? err.message
        : 'Could not join. Try again.'
      setErrorText(message)
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async (joinId: string) => {
    setBusy(true)
    setErrorText(null)
    try {
      await onCancel(joinId)
    } catch (err) {
      console.error('PresenceCard.handleCancel failed:', err)
      setErrorText('Could not cancel. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
    <View style={styles.row}>
      <PresenceBubble displayName={presence.displayName} avatarUrl={presence.avatarUrl} size={40} />

      <View style={styles.info}>
        <Text style={styles.name}>{presence.displayName}</Text>
        {presence.message ? (
          <Text style={styles.message} numberOfLines={1}>{presence.message}</Text>
        ) : null}
      </View>

      {!isOwnPresence && (
        <View style={styles.action}>
          {busy ? (
            <ActivityIndicator size="small" color="#131313" />
          ) : existingJoin?.confirmed ? (
            <Text style={styles.arrivedText}>Arrived</Text>
          ) : existingJoin ? (
            <View style={styles.joinedState}>
              <Text style={styles.onMyWayText}>On my way</Text>
              <TouchableOpacity onPress={() => handleCancel(existingJoin.id)} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin} activeOpacity={0.8}>
              <Text style={styles.joinButtonText}>{`Join ${firstName}`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDECEA',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131313',
  },
  message: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  action: {
    alignItems: 'flex-end',
  },
  joinButton: {
    backgroundColor: '#131313',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  joinedState: {
    alignItems: 'flex-end',
    gap: 4,
  },
  arrivedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D8A4E',
  },
  onMyWayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D8A4E',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E51E1E',
  },
  errorText: {
    fontSize: 12,
    color: '#E51E1E',
    fontWeight: '500',
    paddingBottom: 6,
  },
})
