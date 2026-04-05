/**
 * Tests for useActivePresence hook.
 *
 * Follows the same renderHook pattern as usePoiRatings.test.ts —
 * mock @/lib/supabase and @/hooks/useAuth, render with react-test-renderer.
 */

import React from 'react'
import { act, create } from 'react-test-renderer'

const mockLimitFn = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: mockLimitFn,
            })),
          })),
        })),
      })),
    })),
  },
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import { useActivePresence } from '../useActivePresence'

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

const MOCK_PRESENCE_ROW = {
  id: 'presence-1',
  poi_id: 'poi-1',
  message: 'grabbing coffee',
  visible_to: 'friends' as const,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } })
})

describe('useActivePresence', () => {
  it('activePresence is null when query returns no rows', async () => {
    mockLimitFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('activePresence is populated when query returns a row', async () => {
    mockLimitFn.mockResolvedValue({ data: [MOCK_PRESENCE_ROW], error: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toEqual(MOCK_PRESENCE_ROW)
    // Fix 6: loading is false after query settles on success
    expect(result.current.loading).toBe(false)
  })

  it('setBroadcast updates activePresence locally', async () => {
    mockLimitFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toBeNull()

    act(() => {
      result.current.setBroadcast(MOCK_PRESENCE_ROW)
    })

    expect(result.current.activePresence).toEqual(MOCK_PRESENCE_ROW)
  })

  it('clearBroadcast sets activePresence to null', async () => {
    mockLimitFn.mockResolvedValue({ data: [MOCK_PRESENCE_ROW], error: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toEqual(MOCK_PRESENCE_ROW)

    act(() => {
      result.current.clearBroadcast()
    })

    expect(result.current.activePresence).toBeNull()
  })

  it('sets error state when query fails', async () => {
    mockLimitFn.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.error).toBe('network error')
    expect(result.current.activePresence).toBeNull()
    // Fix 6: loading is false after error path settles
    expect(result.current.loading).toBe(false)
  })

  it('activePresence is null when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ session: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(mockLimitFn).not.toHaveBeenCalled()
  })

  // Fix 6: loading is true before the fetch resolves (pending promise)
  it('loading is true before the fetch resolves', async () => {
    let resolveQuery!: (value: { data: typeof MOCK_PRESENCE_ROW[]; error: null }) => void
    mockLimitFn.mockReturnValue(
      new Promise((resolve) => { resolveQuery = resolve })
    )

    const result = renderHook(() => useActivePresence())
    // Do NOT flush — query is still pending
    expect(result.current.loading).toBe(true)

    // Resolve and clean up to avoid open handles
    await act(async () => { resolveQuery({ data: [], error: null }) })
    expect(result.current.loading).toBe(false)
  })

  // Fix 9: data: null without an error is treated as "no active presence", not an error state
  it('activePresence is null and error is null when data is null but no error returned', async () => {
    mockLimitFn.mockResolvedValue({ data: null, error: null })

    const result = renderHook(() => useActivePresence())
    await flush()

    expect(result.current.activePresence).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
