/**
 * Tests for PoiBottomSheet's "Who's here" section — the integration point where
 * live presences, join state, and session identity converge.
 *
 * Heavy dependencies (BottomSheet, PoiRatingModal, BroadcastModal, etc.) are mocked
 * so only the component's own logic is under test.
 */

import React from 'react'
import { Text } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { Tables } from '@/types/supabase'
import { LivePresenceEntry } from '@/hooks/useLivePresences'
import { PresenceJoin } from '@/lib/presenceJoins'

// ---------------------------------------------------------------------------
// Mock @gorhom/bottom-sheet — render ListHeaderComponent directly
// ---------------------------------------------------------------------------
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef(function MockBottomSheet({ children }: any, _: any) {
      return React.createElement(React.Fragment, null, children)
    }),
    BottomSheetBackdrop: () => null,
    BottomSheetFlatList: function MockBSFlatList({ ListHeaderComponent }: any) {
      return React.createElement(React.Fragment, null, ListHeaderComponent)
    },
  }
})

// ---------------------------------------------------------------------------
// Mock PresenceCard — exposes props as testable text nodes.
// mockPresenceCardProps is prefixed with "mock" so Jest hoisting allows it in the factory.
// ---------------------------------------------------------------------------
const mockPresenceCardProps: any[] = []
jest.mock('@/components/map/PresenceCard', () => ({
  PresenceCard: (props: any) => {
    mockPresenceCardProps.push(props)
    const React = require('react')
    const { Text } = require('react-native')
    return React.createElement(
      Text,
      { testID: 'presence-card' },
      props.presence.displayName + (props.isOwnPresence ? ':own' : ':other')
    )
  },
}))

// ---------------------------------------------------------------------------
// Mock all hooks and heavy deps
// ---------------------------------------------------------------------------
jest.mock('@/hooks/usePoiRatings', () => ({
  usePoiRatings: jest.fn(() => ({
    avgRating: null,
    ratingCount: 0,
    comments: [],
    myRating: null,
    refetch: jest.fn(),
  })),
}))

jest.mock('@/hooks/useProximity', () => ({
  useProximity: jest.fn(() => ({ isNearby: false })),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ session: { user: { id: 'current-user-id' } } })),
}))

jest.mock('@/lib/supabase', () => ({ supabase: {} }))
jest.mock('@/lib/presence', () => ({ dismissPresence: jest.fn() }))

jest.mock('@/components/map/PoiRatingModal', () => ({
  PoiRatingModal: require('react').forwardRef(() => null),
}))

jest.mock('@/components/map/BroadcastModal', () => ({
  BroadcastModal: require('react').forwardRef(() => null),
}))

jest.mock('@/lib/poiCategories', () => ({
  CATEGORY_COLORS: { food_drink: '#FF0000' },
  CATEGORY_LABELS: { food_drink: 'Food & Drink' },
}))

import { PoiBottomSheet } from '../PoiBottomSheet'
import { dismissPresence } from '@/lib/presence'

type Poi = Tables<'pois'>

function makePoi(overrides: Partial<Poi> = {}): Poi {
  return {
    id: 'poi-1',
    name: 'Test Cafe',
    category: 'food_drink',
    lat: 55.6761,
    lng: 12.5683,
    description: null,
    created_by: 'user-system',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Poi
}

const BASE_PROPS = {
  poi: makePoi(),
  onClose: jest.fn(),
  activePresence: null,
  onBroadcast: jest.fn(),
  onDismissBroadcast: jest.fn(),
  locationGranted: false,
  presences: [] as LivePresenceEntry[],
  getJoinForPresence: jest.fn(() => undefined),
  onJoinPresence: jest.fn(),
  onCancelJoin: jest.fn(),
}

function makePresence(overrides: Partial<LivePresenceEntry> = {}): LivePresenceEntry {
  return {
    id: 'presence-1',
    userId: 'other-user-id',
    poiId: 'poi-1',
    displayName: 'Jane Doe',
    avatarUrl: null,
    message: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPresenceCardProps.length = 0
})

describe('PoiBottomSheet — Who\'s here section', () => {
  it('does not render Who\'s here section when no presences are at the current POI', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<PoiBottomSheet {...BASE_PROPS} presences={[]} />)
    })

    const presenceCards = root!.root.findAll(
      (n: ReactTestInstance) => n.props.testID === 'presence-card'
    )
    expect(presenceCards.length).toBe(0)

    const texts = root!.root
      .findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
      .map((n) => String(n.props.children))
    expect(texts.some((t) => t.includes('here'))).toBe(false)
  })

  it('filters presences to only those at the current POI', () => {
    const presenceAtPoi = makePresence({ poiId: 'poi-1' })
    const presenceAtOtherPoi = makePresence({ id: 'presence-other', poiId: 'poi-99' })

    act(() => {
      create(
        <PoiBottomSheet
          {...BASE_PROPS}
          presences={[presenceAtPoi, presenceAtOtherPoi]}
        />
      )
    })

    // Deduplicate by presence id to be robust against React re-renders calling the mock twice
    const uniquePresenceIds = [...new Set(mockPresenceCardProps.map((p) => p.presence.id))]
    expect(uniquePresenceIds).toEqual(['presence-1'])
    expect(mockPresenceCardProps.every((p) => p.presence.poiId !== 'poi-99')).toBe(true)
  })

  it('shows "1 Person here" label for a single presence', () => {
    const presences = [makePresence()]

    let root: ReturnType<typeof create>
    act(() => {
      root = create(<PoiBottomSheet {...BASE_PROPS} presences={presences} />)
    })

    const texts = root!.root
      .findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
      .map((n) => String(n.props.children))
    expect(texts.some((t) => t.includes('1') && t.includes('Person'))).toBe(true)
  })

  it('shows "N People here" label for multiple presences', () => {
    const presences = [
      makePresence({ id: 'p-1' }),
      makePresence({ id: 'p-2', userId: 'user-b', displayName: 'Bob' }),
    ]

    let root: ReturnType<typeof create>
    act(() => {
      root = create(<PoiBottomSheet {...BASE_PROPS} presences={presences} />)
    })

    const texts = root!.root
      .findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
      .map((n) => String(n.props.children))
    expect(texts.some((t) => t.includes('2') && t.includes('People'))).toBe(true)
  })

  it('marks own presence with isOwnPresence=true', () => {
    const ownPresence = makePresence({ userId: 'current-user-id' })
    const otherPresence = makePresence({ id: 'p-other', userId: 'someone-else' })

    act(() => {
      create(
        <PoiBottomSheet
          {...BASE_PROPS}
          presences={[ownPresence, otherPresence]}
        />
      )
    })

    expect(mockPresenceCardProps).toHaveLength(2)
    const own = mockPresenceCardProps.find((p) => p.presence.userId === 'current-user-id')
    const other = mockPresenceCardProps.find((p) => p.presence.userId === 'someone-else')
    expect(own?.isOwnPresence).toBe(true)
    expect(other?.isOwnPresence).toBe(false)
  })

  it('shows dismissError below Leave button when dismissPresence rejects', async () => {
    const { TouchableOpacity } = require('react-native')
    ;(dismissPresence as jest.Mock).mockRejectedValue(new Error('network'))

    const activePresence = { id: 'presence-1', poi_id: 'poi-1', message: null, visible_to: 'community' as const }
    let root: ReturnType<typeof create>
    act(() => {
      root = create(<PoiBottomSheet {...BASE_PROPS} activePresence={activePresence} locationGranted={true} />)
    })

    const leaveBtn = root!.root.findAllByType(TouchableOpacity).find((n: ReactTestInstance) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Leave')
    })
    expect(leaveBtn).toBeDefined()

    await act(async () => { leaveBtn!.props.onPress() })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Could not end broadcast. Try again.')).toBe(true)
  })

  it('passes getJoinForPresence result to PresenceCard as existingJoin', () => {
    const mockJoin: PresenceJoin = {
      id: 'join-1',
      presence_id: 'presence-1',
      joiner_user_id: 'current-user-id',
      joined_at: '2026-01-01T00:00:00Z',
      confirmed: false,
    }
    const getJoinForPresence = jest.fn((id: string) =>
      id === 'presence-1' ? mockJoin : undefined
    )

    act(() => {
      create(
        <PoiBottomSheet
          {...BASE_PROPS}
          presences={[makePresence()]}
          getJoinForPresence={getJoinForPresence}
        />
      )
    })

    expect(getJoinForPresence).toHaveBeenCalledWith('presence-1')
    expect(mockPresenceCardProps[0].existingJoin).toEqual(mockJoin)
  })
})
