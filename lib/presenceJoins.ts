import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export type PresenceJoin = {
  id: string
  presence_id: string
  joiner_user_id: string
  joined_at: string
  confirmed: boolean
}

export async function joinPresence(
  supabase: SupabaseClient<Database>,
  { presenceId }: { presenceId: string }
): Promise<PresenceJoin> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('presence_joins')
    .insert({ presence_id: presenceId, joiner_user_id: user.id })
    .select('id, presence_id, joiner_user_id, joined_at, confirmed')
    .single()

  if (error) throw new Error(error.message)

  // Push notification stub — replace with Expo Push when infra is built in Phase 7
  console.log(`[Push stub] ${user.id} is joining presence ${presenceId}`)

  return data as PresenceJoin
}

export async function cancelJoin(
  supabase: SupabaseClient<Database>,
  { joinId }: { joinId: string }
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('presence_joins')
    .delete()
    .eq('id', joinId)
    .eq('joiner_user_id', user.id)

  if (error) throw new Error(error.message)

  // Push notification stub — replace with Expo Push when infra is built in Phase 7
  console.log(`[Push stub] ${user.id} cancelled join ${joinId}`)
}
