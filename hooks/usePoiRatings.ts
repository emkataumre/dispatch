import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type RatingComment = {
  id: string
  rating: number
  // Only rows where comment IS NOT NULL are included — non-null guaranteed by filter before mapping
  comment: string
  created_at: string
  user_id: string
  display_name: string
}

export type MyRating = {
  id: string
  rating: number
  comment: string | null
}

function getDisplayName(profiles: unknown): string {
  if (!profiles) return 'Unknown'
  if (Array.isArray(profiles)) return (profiles[0] as { display_name?: string })?.display_name ?? 'Unknown'
  return (profiles as { display_name?: string }).display_name ?? 'Unknown'
}

export function usePoiRatings(poiId: string | undefined) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [comments, setComments] = useState<RatingComment[]>([])
  const [myRating, setMyRating] = useState<MyRating | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Accepts an optional isCancelled guard so the useEffect can cancel in-flight
  // requests when poiId changes, while refetch() calls pass no guard.
  const load = useCallback(async (isCancelled?: () => boolean) => {
    if (!poiId) return
    setLoading(true)
    setError(null)

    // Relies on the "Profiles viewable by authenticated users" RLS SELECT policy
    // allowing cross-user reads of display_name. If that policy is ever tightened,
    // profiles will silently return null and display_name will fall back to 'Unknown'.
    const { data, error } = await supabase
      .from('poi_ratings')
      .select('id, rating, comment, created_at, user_id, profiles(display_name)')
      .eq('poi_id', poiId)
      .order('created_at', { ascending: false })

    if (isCancelled?.()) return

    if (error) {
      console.error('usePoiRatings:', error.message)
      setError(error.message)
      setLoading(false)
      return
    }

    const rows = data ?? []
    const total = rows.reduce((sum, r) => sum + r.rating, 0)
    setRatingCount(rows.length)
    setAvgRating(rows.length > 0 ? total / rows.length : null)

    setComments(
      rows
        .filter((r) => r.comment !== null && r.created_at !== null)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment as string,
          created_at: r.created_at as string,
          user_id: r.user_id,
          display_name: getDisplayName(r.profiles),
        }))
    )

    const mine = userId ? (rows.find((r) => r.user_id === userId) ?? null) : null
    setMyRating(mine ? { id: mine.id, rating: mine.rating, comment: mine.comment ?? null } : null)

    setLoading(false)
  }, [poiId, userId])

  useEffect(() => {
    let cancelled = false
    if (!poiId) {
      setAvgRating(null)
      setRatingCount(0)
      setComments([])
      setMyRating(null)
      return
    }
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [poiId, load])

  return { avgRating, ratingCount, comments, myRating, loading, error, refetch: load }
}
