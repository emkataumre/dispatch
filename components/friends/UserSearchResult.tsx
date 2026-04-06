import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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

  const handlePress = async () => {
    if (busy) return

    if (status === 'none') {
      setBusy(true)
      try {
        await onSendRequest()
      } catch (err) {
        console.error('UserSearchResult sendRequest:', err)
      } finally {
        setBusy(false)
      }
      return
    }

    if (status === 'pending_sent') {
      Alert.alert('Cancel request?', '', [
        { text: 'Cancel request', style: 'destructive', onPress: async () => {
          setBusy(true)
          try {
            await onCancelRequest()
          } catch (err) {
            console.error('UserSearchResult cancelRequest:', err)
          } finally {
            setBusy(false)
          }
        }},
        { text: 'Keep', style: 'cancel' },
      ])
      return
    }

    if (status === 'pending_received') {
      setBusy(true)
      try {
        await onAcceptRequest()
      } catch (err) {
        console.error('UserSearchResult acceptRequest:', err)
      } finally {
        setBusy(false)
      }
    }
  }

  const buttonConfig = getButtonConfig(status)

  return (
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
})
