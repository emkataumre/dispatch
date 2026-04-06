import { useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useUserSearch } from '@/hooks/useUserSearch'
import { UserSearchResult } from '@/components/friends/UserSearchResult'
import { UserSearchResult as UserSearchResultType } from '@/lib/friends'

export default function FriendsScreen() {
  const [query, setQuery] = useState('')
  const { results, state, error } = useUserSearch(query)

  return (
    <View style={styles.container}>
      <View style={styles.searchBarWrapper}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by name..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {state === 'idle' && (
        <View style={styles.center}>
          <Text style={styles.hint}>Search for friends by name</Text>
        </View>
      )}

      {state === 'searching' && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#131313" />
        </View>
      )}

      {state === 'results' && results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.hint}>No users found</Text>
        </View>
      )}

      {state === 'results' && results.length > 0 && (
        <FlatList<UserSearchResultType>
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserSearchResult user={item} />}
          contentContainerStyle={styles.list}
        />
      )}

      {state === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Something went wrong'}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    height: 44,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#131313',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 14,
    color: '#e53e3e',
  },
  list: {
    paddingTop: 4,
  },
})
