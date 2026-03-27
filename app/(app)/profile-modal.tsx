import { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ProfileModal() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setDisplayName(data.display_name)
        setAvatarUrl(data.avatar_url)
      }
    }
    loadProfile()
  }, [])

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri)
    }
  }

  async function uploadAvatar(uri: string) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = uri.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const response = await fetch(uri)
    const blob = await response.blob()

    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true })
    if (error) {
      Alert.alert('Error', 'Failed to upload avatar.')
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      Alert.alert('Missing name', 'Display name cannot be empty.')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), avatar_url: avatarUrl })
      .eq('id', user.id)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      router.back()
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={pickAvatar} style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>Add photo</Text>
          </View>
        )}
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
      />

      <Pressable style={styles.button} onPress={saveProfile} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  avatarContainer: { alignSelf: 'center', marginBottom: 24, marginTop: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 13, color: '#999' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#0066FF', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
