import React from 'react'
import { act, create } from 'react-test-renderer'

const mockEqFn = jest.fn()
const mockUseAuth = jest.fn()
const mockJoinPresence = jest.fn()
const mockCancelJoin = jest.fn()

// Realtime channel mock — captured so tests can invoke callbacks directly
let mockSubscribeCallback: ((status: string, err?: unknown) => void) | null = null
let mockUpdateCallback: ((payload: { new: unknown }) => void) | null = null

const mockChannel = {
  on: jest.fn().mockImplementation((_event: string, _filter: unknown, cb: (payload: { new: unknown }) => void) => {
    mockUpdateCallback = cb
    return mockChannel
  }),
  subscribe: jest.fn().mockImplementation((cb: (status: string, err?: unknown) => void) => {
    mockSubscribeCallback = cb
    return mockChannel
  }),
}

const mockRemoveChannel = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: mockEqFn,
      })),
    })),
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/lib/presenceJoins', () => ({
  joinPresence: (...args: unknown[]) => mockJoinPresence(...args),
  cancelJoin: (...args: unknown[]) => mockCancelJoin(...args),
}))

import { usePresenceJoins } from '../usePresenceJoins'

type HookResult<T> = { current: T }

function renderHook<T>(useHook: () => T): HookResult<T> {
  const result: HookResult<T> = { current: undefined as unknown as T }

  function TestComponent() {
    result.current = useHook()
    return null
  }

  act(() => {
    create(React.createElement(TestComponent))
  })

  return result
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

const MOCK_JOIN_ROW = {
  id: 'join-1',
  presence_id: 'presence-1',
  joiner_user_id: 'user-1',
  joined_at: '2026-01-01T00:00:00Z',
  confirmed: false,
}

const MOCK_JOIN_ROW_2 = {
  id: 'join-2',
  presence_id: 'presence-2',
  joiner_user_id: 'user-1',
  joined_at: '2026-01-02T00:00:00Z',
  confirmed: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } })
  mockSubscribeCallback = null
  mockUpdateCallback = null
  const AppState = require('react-native').AppState
  AppState.currentState = 'active'
})

describe('usePresenceJoins', () => {
  it('returns empty joins when query returns no rows', async () => {
    mockEqFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.joins).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('returns joins when query returns rows', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.joins).toEqual([MOCK_JOIN_ROW])
    expect(result.current.loading).toBe(false)
  })

  it('loading is true before the fetch resolves', async () => {
    let resolve!: (value: { data: typeof MOCK_JOIN_ROW[]; error: null }) => void
    mockEqFn.mockReturnValue(new Promise((r) => { resolve = r }))

    const result = renderHook(() => usePresenceJoins())
    expect(result.current.loading).toBe(true)

    await act(async () => { resolve({ data: [], error: null }) })
    expect(result.current.loading).toBe(false)
  })

  it('sets error state when fetch returns a Supabase error', async () => {
    mockEqFn.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.error).toBe('network error')
    expect(result.current.joins).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('sets error state when fetch throws a JS exception', async () => {
    mockEqFn.mockRejectedValue(new Error('connection refused'))

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.error).toBe('connection refused')
    expect(result.current.joins).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('returns empty joins when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ session: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.joins).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockEqFn).not.toHaveBeenCalled()
  })

  it('join() calls joinPresence and appends to state', async () => {
    mockEqFn.mockResolvedValue({ data: [], error: null })
    mockJoinPresence.mockResolvedValue(MOCK_JOIN_ROW)

    const result = renderHook(() => usePresenceJoins())
    await flush()

    await act(async () => {
      await result.current.join('presence-1')
    })

    expect(mockJoinPresence).toHaveBeenCalled()
    expect(result.current.joins).toEqual([MOCK_JOIN_ROW])
  })

  it('join() deduplicates if same row is returned twice', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })
    mockJoinPresence.mockResolvedValue(MOCK_JOIN_ROW)

    const result = renderHook(() => usePresenceJoins())
    await flush()

    await act(async () => {
      await result.current.join('presence-1')
    })

    expect(result.current.joins).toHaveLength(1)
    expect(result.current.joins[0]).toEqual(MOCK_JOIN_ROW)
  })

  it('join() propagates error without mutating state', async () => {
    mockEqFn.mockResolvedValue({ data: [], error: null })
    mockJoinPresence.mockRejectedValue(new Error('unique violation'))

    const result = renderHook(() => usePresenceJoins())
    await flush()

    await expect(
      act(async () => { await result.current.join('presence-1') })
    ).rejects.toThrow('unique violation')

    expect(result.current.joins).toEqual([])
  })

  it('cancel() calls cancelJoin and removes from state', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW, MOCK_JOIN_ROW_2], error: null })
    mockCancelJoin.mockResolvedValue(undefined)

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.joins).toHaveLength(2)

    await act(async () => {
      await result.current.cancel('join-1')
    })

    expect(mockCancelJoin).toHaveBeenCalled()
    expect(result.current.joins).toEqual([MOCK_JOIN_ROW_2])
  })

  it('cancel() propagates error without removing from state', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })
    mockCancelJoin.mockRejectedValue(new Error('Join not found or already cancelled'))

    const result = renderHook(() => usePresenceJoins())
    await flush()

    await expect(
      act(async () => { await result.current.cancel('join-1') })
    ).rejects.toThrow('Join not found or already cancelled')

    expect(result.current.joins).toEqual([MOCK_JOIN_ROW])
  })

  it('getJoinForPresence returns matching join', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW, MOCK_JOIN_ROW_2], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.getJoinForPresence('presence-1')).toEqual(MOCK_JOIN_ROW)
    expect(result.current.getJoinForPresence('presence-2')).toEqual(MOCK_JOIN_ROW_2)
  })

  it('getJoinForPresence returns undefined when no match', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.getJoinForPresence('presence-999')).toBeUndefined()
  })

  it('Realtime UPDATE event updates the matching join in state', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.joins[0].confirmed).toBe(false)

    const confirmedRow = { ...MOCK_JOIN_ROW, confirmed: true }
    await act(async () => {
      mockUpdateCallback!({ new: confirmedRow })
    })

    expect(result.current.joins[0].confirmed).toBe(true)
  })

  it('Realtime UPDATE event does not affect other joins', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW, MOCK_JOIN_ROW_2], error: null })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    const confirmedRow = { ...MOCK_JOIN_ROW, confirmed: true }
    await act(async () => {
      mockUpdateCallback!({ new: confirmedRow })
    })

    expect(result.current.joins).toHaveLength(2)
    expect(result.current.joins.find((j) => j.id === 'join-1')!.confirmed).toBe(true)
    expect(result.current.joins.find((j) => j.id === 'join-2')!.confirmed).toBe(false)
  })

  it('subscribes to UPDATE events filtered by joiner_user_id', async () => {
    mockEqFn.mockResolvedValue({ data: [], error: null })
    renderHook(() => usePresenceJoins())
    await flush()
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'presence_joins',
        filter: expect.stringContaining('joiner_user_id=eq.user-1'),
      }),
      expect.any(Function)
    )
  })

  it('Realtime UPDATE event for unknown join id does not mutate state', async () => {
    mockEqFn.mockResolvedValue({ data: [MOCK_JOIN_ROW], error: null })
    const result = renderHook(() => usePresenceJoins())
    await flush()
    const unknownRow = { ...MOCK_JOIN_ROW, id: 'join-unknown', confirmed: true }
    await act(async () => {
      mockUpdateCallback!({ new: unknownRow })
    })
    expect(result.current.joins).toHaveLength(1)
    expect(result.current.joins[0]).toEqual(MOCK_JOIN_ROW)
  })

  it('suppresses Realtime error when app is backgrounded', async () => {
    const AppState = require('react-native').AppState
    AppState.currentState = 'background'
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockEqFn.mockResolvedValue({ data: [], error: null })
    renderHook(() => usePresenceJoins())
    await flush()

    act(() => { mockSubscribeCallback!('CHANNEL_ERROR') })

    expect(consoleSpy).not.toHaveBeenCalled()

    AppState.currentState = 'active'
    consoleSpy.mockRestore()
  })

  it('logs Realtime error when app is active', async () => {
    const AppState = require('react-native').AppState
    AppState.currentState = 'active'
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockEqFn.mockResolvedValue({ data: [], error: null })
    renderHook(() => usePresenceJoins())
    await flush()

    act(() => { mockSubscribeCallback!('CHANNEL_ERROR', new Error('ws error')) })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CHANNEL_ERROR'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('suppresses TIMED_OUT status when app is backgrounded', async () => {
    const AppState = require('react-native').AppState
    AppState.currentState = 'background'
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockEqFn.mockResolvedValue({ data: [], error: null })
    renderHook(() => usePresenceJoins())
    await flush()

    act(() => { mockSubscribeCallback!('TIMED_OUT') })

    expect(consoleSpy).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('logs TIMED_OUT status when app is active', async () => {
    const AppState = require('react-native').AppState
    AppState.currentState = 'active'
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    mockEqFn.mockResolvedValue({ data: [], error: null })
    renderHook(() => usePresenceJoins())
    await flush()

    act(() => { mockSubscribeCallback!('TIMED_OUT', new Error('timeout')) })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('TIMED_OUT'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('removes Realtime channel on unmount', async () => {
    mockEqFn.mockResolvedValue({ data: [], error: null })

    let renderer: ReturnType<typeof create>
    act(() => {
      renderer = create(React.createElement(function TestUnmount() {
        usePresenceJoins()
        return null
      }))
    })
    await flush()

    act(() => { renderer!.unmount() })

    const { supabase } = require('@/lib/supabase')
    expect(supabase.removeChannel).toHaveBeenCalled()
  })
})
