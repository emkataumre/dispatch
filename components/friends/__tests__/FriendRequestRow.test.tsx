import React from 'react'
import { TouchableOpacity } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { FriendRequestRow } from '../FriendRequestRow'

const MOCK_ENTRY = {
  friendshipId: 'fs-req-1',
  requesterId: 'user-requester',
  displayName: 'Sam Lee',
  avatarUrl: null,
}

function findButtonWithLabel(root: ReturnType<typeof create>, label: string) {
  const touchables = root.root.findAllByType(TouchableOpacity)
  return touchables.find((n) => {
    const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
    return texts.some((t) => String(t.props.children) === label)
  })
}

describe('FriendRequestRow', () => {
  it('renders the display name', () => {
    const onAccept = jest.fn().mockResolvedValue(undefined)
    const onDecline = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Sam Lee')).toBe(true)
  })

  it('calls onAccept when Accept is pressed', async () => {
    const onAccept = jest.fn().mockResolvedValue(undefined)
    const onDecline = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    await act(async () => {
      findButtonWithLabel(root!, 'Accept')!.props.onPress()
    })

    expect(onAccept).toHaveBeenCalled()
    expect(onDecline).not.toHaveBeenCalled()
  })

  it('calls onDecline when Decline is pressed', async () => {
    const onAccept = jest.fn().mockResolvedValue(undefined)
    const onDecline = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    await act(async () => {
      findButtonWithLabel(root!, 'Decline')!.props.onPress()
    })

    expect(onDecline).toHaveBeenCalled()
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('shows ActivityIndicator while accept is in progress', async () => {
    let resolveAccept!: () => void
    const onAccept = jest.fn().mockReturnValue(new Promise<void>((r) => { resolveAccept = r }))
    const onDecline = jest.fn().mockResolvedValue(undefined)

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    act(() => { findButtonWithLabel(root!, 'Accept')!.props.onPress() })

    const spinners = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === 'ActivityIndicator'
    )
    expect(spinners.length).toBeGreaterThan(0)

    await act(async () => { resolveAccept() })
  })

  it('shows inline error when onAccept rejects', async () => {
    const onAccept = jest.fn().mockRejectedValue(new Error('network'))
    const onDecline = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    await act(async () => { findButtonWithLabel(root!, 'Accept')!.props.onPress() })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Could not accept request. Try again.')).toBe(true)
  })

  it('shows inline error when onDecline rejects', async () => {
    const onAccept = jest.fn().mockResolvedValue(undefined)
    const onDecline = jest.fn().mockRejectedValue(new Error('network'))
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    await act(async () => { findButtonWithLabel(root!, 'Decline')!.props.onPress() })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Could not decline request. Try again.')).toBe(true)
  })

  it('shows ActivityIndicator while decline is in progress', async () => {
    let resolveDecline!: () => void
    const onAccept = jest.fn().mockResolvedValue(undefined)
    const onDecline = jest.fn().mockReturnValue(new Promise<void>((r) => { resolveDecline = r }))

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRequestRow entry={MOCK_ENTRY} onAccept={onAccept} onDecline={onDecline} />) })

    act(() => { findButtonWithLabel(root!, 'Decline')!.props.onPress() })

    const spinners = root!.root.findAll(
      (n: ReactTestInstance) => (n.type as string) === 'ActivityIndicator'
    )
    expect(spinners.length).toBeGreaterThan(0)

    await act(async () => { resolveDecline() })
  })
})
