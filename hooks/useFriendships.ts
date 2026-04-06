import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  FriendshipWithProfiles,
  fetchFriendships,
  sendRequest as libSendRequest,
  cancelRequest as libCancelRequest,
  acceptRequest as libAcceptRequest,
  declineRequest as libDeclineRequest,
  unfriend as libUnfriend,
} from '@/lib/friendships'

export type FriendEntry = {
  friendshipId: string
  userId: string
  displayName: string
  avatarUrl: string | null
}

export type RequestEntry = {
  friendshipId: string
  requesterId: string
  displayName: string
  avatarUrl: string | null
}

function deriveState(rows: FriendshipWithProfiles[], userId: string) {
  const friends: FriendEntry[] = []
  const incomingRequests: RequestEntry[] = []
  // Maps counterparty userId → friendshipId for pending-sent rows
  const outgoingRequestMap = new Map<string, string>()

  for (const row of rows) {
    const iAmRequester = row.requester_id === userId
    const counterparty = iAmRequester ? row.addressee : row.requester

    if (row.status === 'accepted') {
      friends.push({
        friendshipId: row.id,
        userId: counterparty.id,
        displayName: counterparty.display_name,
        avatarUrl: counterparty.avatar_url,
      })
    } else if (row.status === 'pending') {
      if (iAmRequester) {
        outgoingRequestMap.set(counterparty.id, row.id)
      } else {
        incomingRequests.push({
          friendshipId: row.id,
          requesterId: row.requester.id,
          displayName: row.requester.display_name,
          avatarUrl: row.requester.avatar_url,
        })
      }
    }
  }

  return { friends, incomingRequests, outgoingRequestMap }
}

export function useFriendships() {
  const { session } = useAuth()
  const [rows, setRows] = useState<FriendshipWithProfiles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelId = useRef(`friendships-changes-${Date.now()}-${Math.random()}`)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setRows([])
      setLoading(false)
      return
    }

    let active = true
    setError(null)
    setLoading(true)

    async function load() {
      try {
        const data = await fetchFriendships(supabase)
        if (!active) return
        setRows(data)
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('useFriendships:', message)
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    // Subscribe to any change on the friendships table and refetch.
    // This keeps both parties in sync without a reload — e.g. the recipient
    // sees an incoming request immediately when the sender taps "Add Friend".
    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friendships' }, () => {
        if (active) load()
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('useFriendships: Realtime error', err ?? '(no details)')
        }
      })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [session?.user.id])

  const userId = session?.user.id ?? ''
  const { friends, incomingRequests, outgoingRequestMap } = deriveState(rows, userId)
  const pendingCount = incomingRequests.length

  const sendRequest = useCallback(async (addresseeId: string): Promise<void> => {
    // Optimistic: add a placeholder to outgoingRequestMap via a synthetic row
    const optimisticRow: FriendshipWithProfiles = {
      id: `optimistic-${Date.now()}`,
      requester_id: userId,
      addressee_id: addresseeId,
      status: 'pending',
      created_at: new Date().toISOString(),
      requester: { id: userId, display_name: '', avatar_url: null },
      addressee: { id: addresseeId, display_name: '', avatar_url: null },
    }
    setRows((prev) => [...prev, optimisticRow])
    try {
      const inserted = await libSendRequest(supabase, { addresseeId })
      // Replace optimistic row with real row (profile data will be fetched next load)
      setRows((prev) =>
        prev.map((r) =>
          r.id === optimisticRow.id
            ? { ...optimisticRow, id: inserted.id }
            : r
        )
      )
    } catch (err) {
      // Roll back
      setRows((prev) => prev.filter((r) => r.id !== optimisticRow.id))
      throw err
    }
  }, [userId])

  const cancelRequest = useCallback(async (friendshipId: string): Promise<void> => {
    const prev = rows
    setRows((r) => r.filter((row) => row.id !== friendshipId))
    try {
      await libCancelRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(prev)
      throw err
    }
  }, [rows])

  const acceptRequest = useCallback(async (friendshipId: string): Promise<void> => {
    const prev = rows
    setRows((r) =>
      r.map((row) => row.id === friendshipId ? { ...row, status: 'accepted' } : row)
    )
    try {
      await libAcceptRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(prev)
      throw err
    }
  }, [rows])

  const declineRequest = useCallback(async (friendshipId: string): Promise<void> => {
    const prev = rows
    setRows((r) => r.filter((row) => row.id !== friendshipId))
    try {
      await libDeclineRequest(supabase, { friendshipId })
    } catch (err) {
      setRows(prev)
      throw err
    }
  }, [rows])

  const unfriend = useCallback(async (friendshipId: string): Promise<void> => {
    const prev = rows
    setRows((r) => r.filter((row) => row.id !== friendshipId))
    try {
      await libUnfriend(supabase, { friendshipId })
    } catch (err) {
      setRows(prev)
      throw err
    }
  }, [rows])

  return {
    friends,
    incomingRequests,
    outgoingRequestMap,
    pendingCount,
    loading,
    error,
    sendRequest,
    cancelRequest,
    acceptRequest,
    declineRequest,
    unfriend,
  }
}
