import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type RatingInsert = Database['public']['Tables']['poi_ratings']['Insert']

export async function submitRating(
  supabase: SupabaseClient<Database>,
  {
    poiId,
    rating,
    comment,
  }: { poiId: string; rating: number; comment?: string }
) {
  // Also enforced at the DB level: CHECK (rating BETWEEN 1 AND 5) on poi_ratings.rating
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const row: RatingInsert = {
    poi_id: poiId,
    user_id: user.id,
    rating,
    comment: comment?.trim() || null,
  }

  const { error } = await supabase.from('poi_ratings').insert(row)
  if (error) throw new Error(error.message)
}
