import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/supabase'

type Poi = Tables<'pois'>

export function usePois() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('pois')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch POIs:', error.message)
        } else {
          setPois(data ?? [])
        }
        setLoading(false)
      })
  }, [])

  return { pois, loading }
}
