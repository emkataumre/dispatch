/**
 * Tests for usePoiRatings data-transformation logic.
 *
 * Approach: the hook uses module-level singletons (supabase, useAuth). We mock
 * both modules with jest.mock, then render the hook via a minimal renderHook
 * helper built on react-test-renderer + React.act — the same primitives that
 * jest-expo uses internally. No @testing-library/react-hooks required.
 *
 * Note: Jest's babel transform requires variables referenced inside jest.mock()
 * factories to be prefixed with "mock" (case-insensitive) to be allowed as
 * out-of-scope references.
 */

import React from 'react'
import { act, create } from 'react-test-renderer'

// ---------------------------------------------------------------------------
// Variables that the jest.mock() factories reference must be mock-prefixed.
// ---------------------------------------------------------------------------

// The terminal `.order()` call is what resolves with test data.
const mockOrderFn = jest.fn()

// useAuth return value — replaced per-test in beforeEach.
const mockUseAuth = jest.fn()

// ---------------------------------------------------------------------------
// Module mocks — hoisted before any imports that trigger the modules.
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: mockOrderFn,
        })),
      })),
    })),
  },
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// ---------------------------------------------------------------------------
// Import hook AFTER mocks are registered.
// ---------------------------------------------------------------------------
import { usePoiRatings } from '../usePoiRatings'

// ---------------------------------------------------------------------------
// Minimal renderHook helper (no @testing-library dependency required).
// ---------------------------------------------------------------------------
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

// Flush all pending microtasks + React state updates.
async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POI_ID = 'poi-abc'

function makeRow(overrides: Partial<{
  id: string
  rating: number
  comment: string | null
  created_at: string
  user_id: string
  profiles: { display_name: string }
}> = {}) {
  return {
    id: 'row-1',
    rating: 4,
    comment: 'Nice place',
    created_at: '2025-01-01T00:00:00Z',
    user_id: 'user-1',
    profiles: { display_name: 'Alice' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  // Default: authenticated user
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } })
})

describe('usePoiRatings', () => {
  it('avgRating is null and ratingCount is 0 when query returns zero rows', async () => {
    mockOrderFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => usePoiRatings(POI_ID))
    await flush()

    expect(result.current.avgRating).toBeNull()
    expect(result.current.ratingCount).toBe(0)
  })

  it('avgRating is computed correctly for two rows with ratings 3 and 5', async () => {
    mockOrderFn.mockResolvedValue({
      data: [makeRow({ id: 'r1', rating: 3 }), makeRow({ id: 'r2', rating: 5 })],
      error: null,
    })

    const result = renderHook(() => usePoiRatings(POI_ID))
    await flush()

    expect(result.current.avgRating).toBe(4)
    expect(result.current.ratingCount).toBe(2)
  })

  it('comments are capped at 5 even when 7 rows with comments are returned', async () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      makeRow({ id: `r${i}`, user_id: `user-${i}`, comment: `Comment ${i}` })
    )
    mockOrderFn.mockResolvedValue({ data: rows, error: null })

    const result = renderHook(() => usePoiRatings(POI_ID))
    await flush()

    expect(result.current.comments.length).toBe(5)
  })

  it('sets error state and leaves avgRating null when query returns an error', async () => {
    mockOrderFn.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const result = renderHook(() => usePoiRatings(POI_ID))
    await flush()

    expect(result.current.error).toBe('network error')
    expect(result.current.avgRating).toBeNull()
  })

  it('myRating is null when session has no userId', async () => {
    mockUseAuth.mockReturnValue({ session: null })
    mockOrderFn.mockResolvedValue({
      data: [makeRow({ id: 'r1', user_id: 'user-1', rating: 5 })],
      error: null,
    })

    const result = renderHook(() => usePoiRatings(POI_ID))
    await flush()

    expect(result.current.myRating).toBeNull()
  })
})
