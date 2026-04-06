import React from 'react'
import { TouchableOpacity } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { FriendRow } from '../FriendRow'

const MOCK_ENTRY = {
  friendshipId: 'fs-1',
  userId: 'user-abc',
  displayName: 'Alex Kim',
  avatarUrl: null,
}

describe('FriendRow', () => {
  it('renders the display name', () => {
    const onUnfriend = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRow entry={MOCK_ENTRY} onUnfriend={onUnfriend} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Alex Kim')).toBe(true)
  })

  it('renders initials avatar fallback', () => {
    const onUnfriend = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRow entry={MOCK_ENTRY} onUnfriend={onUnfriend} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children) === 'AK')
    expect(initialsNode).toBeDefined()
  })

  it('pressing "..." opens the in-app confirmation modal', () => {
    const onUnfriend = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRow entry={MOCK_ENTRY} onUnfriend={onUnfriend} />) })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const menuBtn = touchables.find((n) => n.props.accessibilityLabel === 'Friend options')
    act(() => { menuBtn!.props.onPress() })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children).startsWith('Unfriend'))).toBe(true)
  })

  it('calls onUnfriend when Unfriend button in modal is pressed', async () => {
    const onUnfriend = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRow entry={MOCK_ENTRY} onUnfriend={onUnfriend} />) })

    // Open modal
    const touchables = root!.root.findAllByType(TouchableOpacity)
    const menuBtn = touchables.find((n) => n.props.accessibilityLabel === 'Friend options')
    act(() => { menuBtn!.props.onPress() })

    // Press Unfriend button
    const allTouchables = root!.root.findAllByType(TouchableOpacity)
    const unfriendBtn = allTouchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Unfriend')
    })

    await act(async () => { unfriendBtn!.props.onPress() })

    expect(onUnfriend).toHaveBeenCalled()
  })

  it('Cancel button closes the modal without calling onUnfriend', () => {
    const onUnfriend = jest.fn().mockResolvedValue(undefined)
    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendRow entry={MOCK_ENTRY} onUnfriend={onUnfriend} />) })

    // Open modal
    const touchables = root!.root.findAllByType(TouchableOpacity)
    const menuBtn = touchables.find((n) => n.props.accessibilityLabel === 'Friend options')
    act(() => { menuBtn!.props.onPress() })

    // Press Cancel
    const allTouchables = root!.root.findAllByType(TouchableOpacity)
    const cancelBtn = allTouchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Cancel')
    })
    act(() => { cancelBtn!.props.onPress() })

    expect(onUnfriend).not.toHaveBeenCalled()
  })
})
