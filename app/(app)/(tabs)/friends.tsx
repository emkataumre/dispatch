import { useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { useUserSearch } from '@/hooks/useUserSearch'
import { UserSearchResult } from '@/components/friends/UserSearchResult'

export default function FriendsScreen() {
  const [query, setQuery] = useState('')
  const search = useUserSearch(query)

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

      {search.state === 'idle' && (
        <View style={styles.center}>
          <Text style={styles.hint}>Search for friends by name</Text>
        </View>
      )}

      {search.state === 'searching' && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#131313" />
        </View>
      )}

      {search.state === 'results' && search.results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.hint}>No users found</Text>
        </View>
      )}

      {search.state === 'results' && search.results.length > 0 && (
        <FlatList
          data={search.results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserSearchResult user={item} />}
          contentContainerStyle={styles.list}
        />
      )}

      {search.state === 'error' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{search.error}</Text>
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
