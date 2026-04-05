import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Tables } from '@/types/supabase'

// Use the generated type so it stays in sync with the DB schema automatically.
export type PresenceJoin = Tables<'presence_joins'>

export async function joinPresence(
  supabase: SupabaseClient<Database>,
  { presenceId }: { presenceId: string }
): Promise<PresenceJoin> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('presence_joins')
    .insert({ presence_id: presenceId, joiner_user_id: user.id })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You have already joined this person.')
    throw new Error(error.message)
  }

  try {
    // Push notification stub — replace with Expo Push when infra is built in Phase 7
    console.log(`[Push stub] ${user.id} is joining presence ${presenceId}`)
  } catch (pushErr) {
    console.error('[Push stub] Failed to send join notification:', pushErr)
    // Join succeeded — push failure is non-fatal
  }

  return data as PresenceJoin
}

export async function cancelJoin(
  supabase: SupabaseClient<Database>,
  { joinId }: { joinId: string }
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { count, error } = await supabase
    .from('presence_joins')
    .delete({ count: 'exact' })
    .eq('id', joinId)
    .eq('joiner_user_id', user.id)

  if (error) throw new Error(error.message)
  if ((count ?? 0) === 0) throw new Error('Join not found or already cancelled')

  try {
    // Push notification stub — replace with Expo Push when infra is built in Phase 7
    console.log(`[Push stub] ${user.id} cancelled join ${joinId}`)
  } catch (pushErr) {
    console.error('[Push stub] Failed to send cancel notification:', pushErr)
    // Cancel succeeded — push failure is non-fatal
  }
}
