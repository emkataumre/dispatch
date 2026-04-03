/**
 * Tests for useAllPoiRatings data-transformation logic.
 *
 * Mocks the supabase client so the hook never hits the network.
 * Uses a minimal renderHook helper built on react-test-renderer + React.act
 * (no @testing-library/react-hooks needed).
 */

import React from 'react'
import { act, create } from 'react-test-renderer'

// ---------------------------------------------------------------------------
// mock-prefixed variables referenced inside jest.mock() factories.
// ---------------------------------------------------------------------------

const mockSelectFn = jest.fn()

// ---------------------------------------------------------------------------
// Module mocks — hoisted before imports.
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelectFn,
    })),
  },
}))

// ---------------------------------------------------------------------------
// Import hook AFTER mocks are registered.
// ---------------------------------------------------------------------------
import { useAllPoiRatings } from '../useAllPoiRatings'

// ---------------------------------------------------------------------------
// Minimal renderHook helper.
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

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useAllPoiRatings', () => {
  it('avgRatings is empty when query returns no rows', async () => {
    mockSelectFn.mockResolvedValue({ data: [], error: null })

    const result = renderHook(() => useAllPoiRatings())
    await flush()

    expect(result.current.avgRatings).toEqual({})
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('maps a pre-aggregated avg_rating row into the avgRatings record', async () => {
    mockSelectFn.mockResolvedValue({
      data: [
        { poi_id: 'poi-1', avg_rating: 4 },
      ],
      error: null,
    })

    const result = renderHook(() => useAllPoiRatings())
    await flush()

    expect(result.current.avgRatings['poi-1']).toBe(4)
    expect(result.current.loading).toBe(false)
  })

  it('maps pre-aggregated rows for two POIs into independent avgRatings entries', async () => {
    mockSelectFn.mockResolvedValue({
      data: [
        { poi_id: 'poi-1', avg_rating: 2 },
        { poi_id: 'poi-2', avg_rating: 4.5 },
      ],
      error: null,
    })

    const result = renderHook(() => useAllPoiRatings())
    await flush()

    expect(result.current.avgRatings['poi-1']).toBe(2)
    expect(result.current.avgRatings['poi-2']).toBe(4.5)
    expect(result.current.loading).toBe(false)
  })

  it('excludes rows where avg_rating is null', async () => {
    mockSelectFn.mockResolvedValue({
      data: [
        { poi_id: 'poi-1', avg_rating: null },
        { poi_id: 'poi-2', avg_rating: 3.5 },
      ],
      error: null,
    })

    const result = renderHook(() => useAllPoiRatings())
    await flush()

    expect(result.current.avgRatings['poi-1']).toBeUndefined()
    expect(result.current.avgRatings['poi-2']).toBe(3.5)
    expect(result.current.loading).toBe(false)
  })

  it('sets error and leaves avgRatings empty when query fails', async () => {
    mockSelectFn.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const result = renderHook(() => useAllPoiRatings())
    await flush()

    expect(result.current.error).toBe('network error')
    expect(result.current.avgRatings).toEqual({})
    expect(result.current.loading).toBe(false)
  })
})
