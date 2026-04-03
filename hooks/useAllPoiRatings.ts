import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Shape of a row returned by the poi_avg_ratings view (migration 009).
// Typed manually here because the view was added after the last `supabase gen types` run.
// TODO: remove this type and the cast below once types/supabase.ts is regenerated after migration 009.
type AvgRatingRow = { poi_id: string; avg_rating: number | null }

export function useAllPoiRatings() {
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from('poi_avg_ratings')
        .select('poi_id, avg_rating') as { data: AvgRatingRow[] | null; error: { message: string } | null }

      if (signal?.cancelled) return

      if (fetchError) {
        console.error('useAllPoiRatings:', fetchError.message)
        setError(fetchError.message)
        return
      }
      const result: Record<string, number> = {}
      for (const row of data ?? []) {
        if (row.avg_rating !== null) {
          result[row.poi_id] = Number(row.avg_rating)
        }
      }
      setAvgRatings(result)
    } catch (e) {
      if (signal?.cancelled) return
      const message = e instanceof Error ? e.message : 'Unknown error fetching ratings'
      console.error('useAllPoiRatings (unexpected):', message)
      setError(message)
    } finally {
      if (!signal?.cancelled) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    refetch(signal)
    return () => { signal.cancelled = true }
  }, [refetch])

  return { avgRatings, loading, error, refetch }
}
