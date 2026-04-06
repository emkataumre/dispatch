import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { IncomingRequestsSection } from '../IncomingRequestsSection'

jest.mock('../FriendRequestRow', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  return {
    FriendRequestRow: ({ entry }: { entry: { displayName: string } }) =>
      React.createElement(View, { testID: 'request-row' },
        React.createElement(Text, null, entry.displayName)
      ),
  }
})

function makeRequests(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    friendshipId: `fs-${i}`,
    requesterId: `user-${i}`,
    displayName: `User ${i}`,
    avatarUrl: null,
  }))
}

const onAccept = jest.fn().mockResolvedValue(undefined)
const onDecline = jest.fn().mockResolvedValue(undefined)

beforeEach(() => {
  jest.clearAllMocks()
})

function countRows(root: ReturnType<typeof create>) {
  // Only count View-type nodes with testID to avoid deep duplicates
  return root.root.findAll(
    (n: ReactTestInstance) => n.type === View && n.props.testID === 'request-row'
  ).length
}

function getTextContent(root: ReturnType<typeof create>): string[] {
  return root.root
    .findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    .map((n) => {
      const c = n.props.children
      return Array.isArray(c) ? c.join('') : String(c)
    })
}

describe('IncomingRequestsSection', () => {
  it('returns null when requests is empty', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <IncomingRequestsSection requests={[]} onAccept={onAccept} onDecline={onDecline} />
      )
    })
    expect(root!.toJSON()).toBeNull()
  })

  it('renders all entries when there are 3 or fewer requests', () => {
    const requests = makeRequests(3)
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <IncomingRequestsSection requests={requests} onAccept={onAccept} onDecline={onDecline} />
      )
    })

    expect(countRows(root!)).toBe(3)

    // No "View more" button
    const touchables = root!.root.findAllByType(TouchableOpacity)
    expect(touchables).toHaveLength(0)
  })

  it('shows only first 3 entries when there are more than 3', () => {
    const requests = makeRequests(5)
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <IncomingRequestsSection requests={requests} onAccept={onAccept} onDecline={onDecline} />
      )
    })

    expect(countRows(root!)).toBe(3)
  })

  it('shows "View N more" button with correct count', () => {
    const requests = makeRequests(6)
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <IncomingRequestsSection requests={requests} onAccept={onAccept} onDecline={onDecline} />
      )
    })

    const texts = getTextContent(root!)
    expect(texts.some((t) => t === 'View 3 more')).toBe(true)
  })

  it('pressing "View N more" shows all entries', () => {
    const requests = makeRequests(5)
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <IncomingRequestsSection requests={requests} onAccept={onAccept} onDecline={onDecline} />
      )
    })

    // Initially 3 visible
    expect(countRows(root!)).toBe(3)

    // Press "View more"
    const touchable = root!.root.findAllByType(TouchableOpacity)[0]
    act(() => { touchable.props.onPress() })

    // Now all 5 visible
    expect(countRows(root!)).toBe(5)

    // "View more" button is gone
    const touchables = root!.root.findAllByType(TouchableOpacity)
    expect(touchables).toHaveLength(0)
  })
})
