import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useAllPoiRatings() {
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('poi_avg_ratings')
      .select('poi_id, avg_rating')
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
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
