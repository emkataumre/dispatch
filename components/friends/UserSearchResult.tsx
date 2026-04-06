import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { UserAvatar } from '@/components/UserAvatar'
import { UserSearchResult as UserSearchResultType } from '@/lib/friends'

interface Props {
  user: UserSearchResultType
}

export function UserSearchResult({ user }: Props) {
  const handleAddFriend = () => {
    console.log('[Friend stub]', user.id, user.display_name)
  }

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
      <TouchableOpacity style={styles.addButton} onPress={handleAddFriend} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>Add Friend</Text>
      </TouchableOpacity>
    </View>
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
  addButton: {
    backgroundColor: '#131313',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
