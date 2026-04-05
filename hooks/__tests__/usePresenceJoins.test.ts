import React from 'react'
import { act, create } from 'react-test-renderer'

const mockEqFn = jest.fn()
const mockUseAuth = jest.fn()
const mockJoinPresence = jest.fn()
const mockCancelJoin = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: mockEqFn,
      })),
    })),
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

  it('sets error state when fetch fails', async () => {
    mockEqFn.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const result = renderHook(() => usePresenceJoins())
    await flush()

    expect(result.current.error).toBe('network error')
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
})
