import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { searchUsers, UserSearchResult } from '@/lib/friends'

type SearchState = 'idle' | 'searching' | 'results' | 'error'

export function useUserSearch(query: string): {
  results: UserSearchResult[]
  state: SearchState
  error: string | null
} {
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [state, setState] = useState<SearchState>('idle')
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResults([])
      setState('idle')
      setError(null)
      return
    }

    let active = true
    setState('searching')

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(supabase, { query: trimmed })
        if (!active) return
        setResults(data)
        setState('results')
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Search failed')
        setState('error')
        setResults([])
      }
    }, 300)

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return { results, state, error }
}
