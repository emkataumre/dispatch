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
      LocationPuck: function MockLocationPuck() { return null },
      StyleURL: {
        Light: 'mapbox://styles/mapbox/light-v10',
      },
    },
  }
})

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 55.6761, longitude: 12.5683 } })
  ),
  Accuracy: { High: 3 },
}))

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

// Fix 5: use real useState so setBroadcast/clearBroadcast actually update activePresence
jest.mock('@/hooks/useActivePresence', () => {
  const { useState } = require('react')
  return {
    useActivePresence: () => {
      const [activePresence, setActivePresence] = useState(null)
      return {
        activePresence,
        loading: false,
        error: null,
        setBroadcast: setActivePresence,
        clearBroadcast: () => setActivePresence(null),
      }
    },
  }
})

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
    expect(camera.props.defaultSettings.centerCoordinate).toEqual([12.5683, 55.6761])
    expect(camera.props.defaultSettings.zoomLevel).toBe(13)
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

  it('return-to-location button calls setCamera with user coordinates', async () => {
    // render with async act so locationGranted flushes to true
    let root: ReturnType<typeof create>
    await act(async () => { root = create(<MapScreen />) })

    const btn = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'return-to-location' && typeof n.props.onPress === 'function'
    )[0]
    expect(btn).toBeDefined()

    await act(async () => { btn.props.onPress() })

    expect(mockSetCamera).toHaveBeenCalledWith({
      centerCoordinate: [12.5683, 55.6761],
      zoomLevel: 15,
      animationDuration: 800,
    })
  })

  it('hides LocationPuck and return-to-location button when permission is denied', async () => {
    const Location = require('expo-location')
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' })

    let root: ReturnType<typeof create>
    await act(async () => { root = create(<MapScreen />) })

    expect(root!.root.findAllByType(Mapbox.LocationPuck).length).toBe(0)
    const btns = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'return-to-location'
    )
    expect(btns.length).toBe(0)
  })

  it('hides return-to-location button in list mode', async () => {
    let root: ReturnType<typeof create>
    await act(async () => { root = create(<MapScreen />) })

    // switch to list mode
    const toggle = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'view-mode-toggle' && typeof n.props.onPress === 'function'
    )[0]
    act(() => { toggle.props.onPress() })

    const btns = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'return-to-location'
    )
    expect(btns.length).toBe(0)
  })

  it('renders LocationPuck when location permission is granted', async () => {
    let root: ReturnType<typeof create>
    await act(async () => { root = create(<MapScreen />) })

    expect(root!.root.findAllByType(Mapbox.LocationPuck).length).toBe(1)
  })

  // Fix 5: verify setBroadcast/clearBroadcast wiring through PoiBottomSheet props
  it('passes setBroadcast and clearBroadcast to PoiBottomSheet and they update activePresence', () => {
    const mockPresence = {
      id: 'presence-1',
      poi_id: 'poi-1',
      message: 'here now',
      visible_to: 'friends' as const,
    }

    let root: ReturnType<typeof create>
    act(() => { root = create(<MapScreen />) })

    const sheet = root!.root.findByType(PoiBottomSheet)

    // onBroadcast and onDismissBroadcast props must be functions
    expect(typeof sheet.props.onBroadcast).toBe('function')
    expect(typeof sheet.props.onDismissBroadcast).toBe('function')

    // Calling onBroadcast sets activePresence on the sheet
    act(() => { sheet.props.onBroadcast(mockPresence) })
    expect(root!.root.findByType(PoiBottomSheet).props.activePresence).toEqual(mockPresence)

    // Calling onDismissBroadcast clears it
    act(() => { sheet.props.onDismissBroadcast() })
    expect(root!.root.findByType(PoiBottomSheet).props.activePresence).toBeNull()
  })
})
