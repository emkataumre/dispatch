import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function insertCheckIn(
  supabase: SupabaseClient<Database>,
  { poiId }: { poiId: string }
): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('semester_id')
    .eq('id', user.id)
    .single()
  if (profileError) throw new Error(profileError.message)

  const { error } = await supabase
    .from('check_ins')
    .insert({
      user_id: user.id,
      poi_id: poiId,
      semester_id: profile.semester_id,
    })
  if (error) throw new Error(error.message)
}
