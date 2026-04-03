/**
 * Tests for MapScreen behavioral contracts introduced in the POI list view feature.
 *
 * Mocks all child components so only MapScreen's own logic is under test.
 * Uses react-test-renderer + React.act (no @testing-library/react-native needed).
 */

import React from 'react'
import { Text } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'

// ---------------------------------------------------------------------------
// Mapbox mock — Camera wires setCamera to a stable spy via useImperativeHandle.
// mockSetCamera is prefixed with "mock" so Jest hoisting allows it in the factory.
// ---------------------------------------------------------------------------
const mockSetCamera = jest.fn()

jest.mock('@rnmapbox/maps', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: {
      MapView: function MockMapView({ children }: { children: React.ReactNode }) {
        return React.createElement(React.Fragment, null, children)
      },
      Camera: React.forwardRef(function MockCamera(_: any, ref: any) {
        React.useImperativeHandle(ref, () => ({ setCamera: mockSetCamera }))
        return null
      }),
    },
  }
})

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------
const mockRefetchRatings = jest.fn()

jest.mock('@/hooks/usePois', () => ({
  usePois: jest.fn(() => ({ pois: [], error: null })),
}))

jest.mock('@/hooks/useAllPoiRatings', () => ({
  useAllPoiRatings: jest.fn(() => ({
    avgRatings: {},
    loading: false,
    error: null,
    refetch: mockRefetchRatings,
  })),
}))

// ---------------------------------------------------------------------------
// Child component mocks — render null so only MapScreen's own nodes are visible
// ---------------------------------------------------------------------------
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
jest.mock('@/components/map/PoiLayer', () => ({ PoiLayer: (props: any) => null }))
jest.mock('@/components/map/CategoryFilterBar', () => ({ CategoryFilterBar: () => null }))
jest.mock('@/components/map/PoiBottomSheet', () => ({ PoiBottomSheet: (props: any) => null }))
jest.mock('@/components/map/PoiListView', () => ({ PoiListView: (props: any) => null }))

// ---------------------------------------------------------------------------
// Imports resolve to mocked versions — used with findByType
// ---------------------------------------------------------------------------
import Mapbox from '@rnmapbox/maps'
import { usePois } from '@/hooks/usePois'
import { useAllPoiRatings } from '@/hooks/useAllPoiRatings'
import { PoiLayer } from '@/components/map/PoiLayer'
import { PoiBottomSheet } from '@/components/map/PoiBottomSheet'
import { PoiListView } from '@/components/map/PoiListView'
import { Tables } from '@/types/supabase'
import MapScreen from '../index'

type Poi = Tables<'pois'>

function makePoi(overrides: Partial<Poi> = {}): Poi {
  return {
    id: 'poi-1',
    name: 'Test Cafe',
    category: 'food_drink',
    lat: 55.6761,
    lng: 12.5683,
    description: null,
    created_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  } as Poi
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePois as jest.Mock).mockReturnValue({ pois: [], error: null })
    ;(useAllPoiRatings as jest.Mock).mockReturnValue({
      avgRatings: {},
      loading: false,
      error: null,
      refetch: mockRefetchRatings,
    })
  })

  it('Camera initializes centered on Copenhagen at zoom 13', () => {
    let root: ReturnType<typeof create>

    act(() => { root = create(<MapScreen />) })

    const camera = root!.root.findByType(Mapbox.Camera)
    expect(camera.props.centerCoordinate).toEqual([12.5683, 55.6761])
    expect(camera.props.zoomLevel).toBe(13)
  })

  it('handleSheetClose clears selected POI and calls refetchRatings', () => {
    const poi = makePoi()
    let root: ReturnType<typeof create>

    act(() => { root = create(<MapScreen />) })

    // Open bottom sheet by tapping a map POI
    act(() => { root!.root.findByType(PoiLayer).props.onPoiPress(poi) })
    expect(root!.root.findByType(PoiBottomSheet).props.poi).toEqual(poi)

    // Close the sheet
    act(() => { root!.root.findByType(PoiBottomSheet).props.onClose() })

    expect(root!.root.findByType(PoiBottomSheet).props.poi).toBeNull()
    expect(mockRefetchRatings).toHaveBeenCalledTimes(1)
  })

  it('handleListRowPress switches to map, opens bottom sheet, and flies camera to POI', () => {
    const poi = makePoi({ id: 'poi-fly', lat: 55.7, lng: 12.6 })
    let root: ReturnType<typeof create>

    act(() => { root = create(<MapScreen />) })

    // Switch to list mode via the toggle button
    const toggle = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'view-mode-toggle' && typeof n.props.onPress === 'function'
    )[0]
    act(() => { toggle.props.onPress() })
    expect(root!.root.findAllByType(PoiListView).length).toBeGreaterThan(0)

    // Press a list row
    act(() => { root!.root.findByType(PoiListView).props.onPoiPress(poi) })

    // Map mode restored — list view is gone
    expect(root!.root.findAllByType(PoiListView).length).toBe(0)
    // Bottom sheet receives the pressed POI
    expect(root!.root.findByType(PoiBottomSheet).props.poi).toEqual(poi)
    // Camera flies to the POI's coordinates
    expect(mockSetCamera).toHaveBeenCalledWith({
      centerCoordinate: [poi.lng, poi.lat],
      zoomLevel: 15,
      animationDuration: 800,
    })
  })

  it('error banner shows POI connection message when usePois errors', () => {
    ;(usePois as jest.Mock).mockReturnValue({ pois: [], error: 'network error' })
    let root: ReturnType<typeof create>

    act(() => { root = create(<MapScreen />) })

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) =>
        String(n.props.children).includes("Couldn't load places")
      )
    expect(hasMessage).toBe(true)
  })

  it('error banner shows ratings message when only useAllPoiRatings errors', () => {
    ;(useAllPoiRatings as jest.Mock).mockReturnValue({
      avgRatings: {},
      loading: false,
      error: 'ratings error',
      refetch: mockRefetchRatings,
    })
    let root: ReturnType<typeof create>

    act(() => { root = create(<MapScreen />) })

    const hasMessage = root!.root
      .findAllByType(Text)
      .some((n: ReactTestInstance) =>
        String(n.props.children).includes('Ratings unavailable')
      )
    expect(hasMessage).toBe(true)
  })
})
