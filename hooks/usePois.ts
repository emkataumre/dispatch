import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/supabase'

type Poi = Tables<'pois'>

export function usePois() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    supabase
      .from('pois')
      .select('*')
      .then(({ data, error: fetchError }) => {
        if (!active) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setPois(data ?? [])
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { pois, loading, error }
}
