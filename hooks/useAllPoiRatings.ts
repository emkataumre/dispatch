import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Shape of a row returned by the poi_avg_ratings view (migration 009).
// Typed manually here because the view was added after the last `supabase gen types` run.
// TODO: remove this type and the cast below once types/supabase.ts is regenerated after migration 009.
type AvgRatingRow = { poi_id: string; avg_rating: number | null }

export function useAllPoiRatings() {
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('poi_avg_ratings')
      .select('poi_id, avg_rating')
      .then(({ data, error: fetchError }: { data: AvgRatingRow[] | null; error: { message: string } | null }) => {
        if (!active) return
        if (fetchError) {
          console.error('useAllPoiRatings:', fetchError.message)
          setError(fetchError.message)
          setLoading(false)
          return
        }
        const result: Record<string, number> = {}
        for (const row of data ?? []) {
          if (row.avg_rating !== null) {
            result[row.poi_id] = Number(row.avg_rating)
          }
        }
        setAvgRatings(result)
        setLoading(false)
      })

    return () => { active = false }
  }, [])

  return { avgRatings, loading, error }
}
