import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export type UserSearchResult = {
  id: string
  display_name: string
  avatar_url: string | null
}

export async function searchUsers(
  supabase: SupabaseClient<Database>,
  { query }: { query: string }
): Promise<UserSearchResult[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `${query}%`)
    .neq('id', user.id)
    .limit(20)

  if (error) throw new Error(error.message)
  return (data as UserSearchResult[]) ?? []
}
