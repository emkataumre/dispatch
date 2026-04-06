/**
 * Tests for useLivePresences hook.
 *
 * Follows the same renderHook + flush pattern as useActivePresence.test.ts.
 * Mocks @/lib/supabase (initial fetch + Realtime channel) and @/hooks/useAuth.
 */

import React from 'react'
import { act, create } from 'react-test-renderer'

// ---------------------------------------------------------------------------
// Mock leaf fns — prefixed with "mock" so Jest hoisting allows use in factory
// ---------------------------------------------------------------------------
const mockNeqFn = jest.fn()
const mockSingleFn = jest.fn()
const mockSubscribeFn = jest.fn()
const mockChannelOnFn = jest.fn()
const mockUseAuth = jest.fn()

// removeChannel is declared as jest.fn() directly in the factory so it is always
// a function at factory-run time (avoids TDZ issues with eagerly-evaluated references).
// Tests access it via the imported supabase mock.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingleFn })) })) }
      }
      // live_presence
      return { select: jest.fn(() => ({ is: jest.fn(() => ({ neq: mockNeqFn })) })) }
    }),
    channel: jest.fn(() => ({ on: mockChannelOnFn, subscribe: mockSubscribeFn })),
    removeChannel: jest.fn(),
  },
}))

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

import { supabase } from '@/lib/supabase'
import { useLivePresences } from '../useLivePresences'

type HookResult<T> = { current: T }

function renderHook<T>(useHook: () => T): HookResult<T> {
  const result: HookResult<T> = { current: undefined as unknown as T }
  function TestComponent() {
    result.current = useHook()
    return null
  }
  act(() => { create(React.createElement(TestComponent)) })
  return result
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'presence-1',
    user_id: 'user-2',
    poi_id: 'poi-1',
    message: 'grabbing coffee',
    profiles: { display_name: 'Jane Doe', avatar_url: null },
    ...overrides,
  }
}

function makeInsertPayload(overrides: Record<string, unknown> = {}) {
  return {
    new: {
      id: 'presence-2',
      user_id: 'user-3',
      poi_id: 'poi-1',
      message: 'hey',
      dismissed_at: null,
      visible_to: 'community',
      created_at: '2026-01-01T00:00:00Z',
      ...overrides,
    },
  }
}

// Capture INSERT/UPDATE handlers after the hook mounts
function getCapturedHandlers() {
  const insertCall = mockChannelOnFn.mock.calls.find(
    (c: unknown[]) => (c[1] as { event: string }).event === 'INSERT'
  )
  const updateCall = mockChannelOnFn.mock.calls.find(
    (c: unknown[]) => (c[1] as { event: string }).event === 'UPDATE'
  )
  return {
    insertHandler: insertCall?.[2] as ((p: unknown) => Promise<void>) | undefined,
    updateHandler: updateCall?.[2] as ((p: unknown) => void) | undefined,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } })
  mockNeqFn.mockResolvedValue({ data: [], error: null })
  // Make .on() chainable and capture event/handler
  mockChannelOnFn.mockImplementation((_event: string, _filter: unknown, _handler: unknown) => ({
    on: mockChannelOnFn,
    subscribe: mockSubscribeFn,
  }))
  mockSubscribeFn.mockReturnValue('mock-channel-ref')
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useLivePresences', () => {
  it('returns empty presences when initial fetch returns no rows', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.presences).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('maps initial fetch rows to LivePresenceEntry correctly', async () => {
    mockNeqFn.mockResolvedValue({ data: [makeRow()], error: null })

    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.presences).toEqual([
      {
        id: 'presence-1',
        userId: 'user-2',
        poiId: 'poi-1',
        displayName: 'Jane Doe',
        avatarUrl: null,
        message: 'grabbing coffee',
      },
    ])
  })

  it('does not include current user in initial fetch results', async () => {
    // The neq filter is applied by the DB; confirm the hook passes the right userId
    const { supabase } = require('@/lib/supabase')
    mockNeqFn.mockResolvedValue({ data: [], error: null })

    renderHook(() => useLivePresences())
    await flush()

    // find the neq call on the live_presence chain
    const fromCall = (supabase.from as jest.Mock).mock.calls.find(
      (c: string[]) => c[0] === 'live_presence'
    )
    expect(fromCall).toBeDefined()
    // neq is the last call in the chain — it should have been called with ('user_id', 'user-1')
    expect(mockNeqFn).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('adds a presence on INSERT and always fetches fresh profile', async () => {
    // Seed via initial fetch (user-2 is cached with "Jane Doe")
    mockNeqFn.mockResolvedValue({ data: [makeRow()], error: null })
    mockSingleFn.mockResolvedValue({
      data: { display_name: 'Jane Doe Updated', avatar_url: 'https://example.com/new.jpg' },
      error: null,
    })
    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    expect(insertHandler).toBeDefined()

    // Fire INSERT for same user — should fetch fresh profile, not use cache
    await act(async () => {
      await insertHandler!(makeInsertPayload({ user_id: 'user-2', id: 'presence-3' }))
    })

    expect(result.current.presences).toHaveLength(2)
    expect(result.current.presences[1].id).toBe('presence-3')
    expect(result.current.presences[1].displayName).toBe('Jane Doe Updated')
    expect(result.current.presences[1].avatarUrl).toBe('https://example.com/new.jpg')
    expect(mockSingleFn).toHaveBeenCalledTimes(1) // always fetches fresh
  })

  it('fetches profile on INSERT when user is not in cache (cache miss)', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    mockSingleFn.mockResolvedValue({
      data: { display_name: 'Bob Smith', avatar_url: 'https://example.com/bob.jpg' },
      error: null,
    })

    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    await act(async () => { await insertHandler!(makeInsertPayload()) })

    expect(mockSingleFn).toHaveBeenCalledTimes(1)
    expect(result.current.presences).toHaveLength(1)
    expect(result.current.presences[0].displayName).toBe('Bob Smith')
    expect(result.current.presences[0].avatarUrl).toBe('https://example.com/bob.jpg')
  })

  it('removes a presence on UPDATE when dismissed_at is set', async () => {
    mockNeqFn.mockResolvedValue({ data: [makeRow()], error: null })
    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.presences).toHaveLength(1)

    const { updateHandler } = getCapturedHandlers()
    act(() => {
      updateHandler!({
        new: { id: 'presence-1', user_id: 'user-2', dismissed_at: '2026-01-01T01:00:00Z' },
      })
    })

    expect(result.current.presences).toHaveLength(0)
  })

  it('ignores INSERT from the current user', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    await act(async () => {
      await insertHandler!(makeInsertPayload({ user_id: 'user-1' })) // own user
    })

    expect(result.current.presences).toHaveLength(0)
  })

  it('ignores INSERT when dismissed_at is already set', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    await act(async () => {
      await insertHandler!(makeInsertPayload({ dismissed_at: '2026-01-01T00:00:00Z' }))
    })

    expect(result.current.presences).toHaveLength(0)
  })

  it('loading is true before the fetch resolves', () => {
    let resolve!: (v: { data: unknown[]; error: null }) => void
    mockNeqFn.mockReturnValue(new Promise((r) => { resolve = r }))

    const result = renderHook(() => useLivePresences())
    expect(result.current.loading).toBe(true)

    act(() => { resolve({ data: [], error: null }) })
  })

  it('sets error state when initial fetch fails', async () => {
    mockNeqFn.mockResolvedValue({ data: null, error: { message: 'network failure' } })

    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.error).toBe('network failure')
    expect(result.current.loading).toBe(false)
  })

  it('adds presence with fallback name when profile fetch fails on cache miss', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    mockSingleFn.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    await act(async () => { await insertHandler!(makeInsertPayload()) })

    expect(result.current.presences).toHaveLength(1)
    expect(result.current.presences[0].displayName).toBe('Unknown')
    expect(result.current.presences[0].avatarUrl).toBeNull()
  })

  it('updates the message field on a non-dismissal UPDATE', async () => {
    mockNeqFn.mockResolvedValue({ data: [makeRow({ message: 'original' })], error: null })
    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.presences[0].message).toBe('original')

    const { updateHandler } = getCapturedHandlers()
    act(() => {
      updateHandler!({
        new: { id: 'presence-1', user_id: 'user-2', dismissed_at: null, message: 'updated' },
      })
    })

    expect(result.current.presences).toHaveLength(1)
    expect(result.current.presences[0].message).toBe('updated')
  })

  it('does not deduplicate unrelated presences on successive INSERTs', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    mockSingleFn.mockResolvedValue({
      data: { display_name: 'Bob', avatar_url: null },
      error: null,
    })

    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    await act(async () => { await insertHandler!(makeInsertPayload({ id: 'p-a' })) })
    await act(async () => { await insertHandler!(makeInsertPayload({ id: 'p-b' })) })

    expect(result.current.presences).toHaveLength(2)
  })

  it('does not add the same presence twice on duplicate INSERTs', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })
    mockSingleFn.mockResolvedValue({
      data: { display_name: 'Bob', avatar_url: null },
      error: null,
    })

    const result = renderHook(() => useLivePresences())
    await flush()

    const { insertHandler } = getCapturedHandlers()
    const payload = makeInsertPayload({ id: 'presence-dup' })
    await act(async () => { await insertHandler!(payload) })
    await act(async () => { await insertHandler!(payload) })

    expect(result.current.presences).toHaveLength(1)
  })

  it('calls removeChannel on unmount', async () => {
    mockNeqFn.mockResolvedValue({ data: [], error: null })

    let unmount!: () => void
    act(() => {
      const renderer = create(
        React.createElement(function TestComponent() {
          useLivePresences()
          return null
        })
      )
      unmount = () => renderer.unmount()
    })
    await flush()

    act(() => { unmount() })

    expect((supabase as any).removeChannel).toHaveBeenCalledTimes(1)
  })

  it('returns empty presences when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ session: null })

    const result = renderHook(() => useLivePresences())
    await flush()

    expect(result.current.presences).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockNeqFn).not.toHaveBeenCalled()
  })
})
