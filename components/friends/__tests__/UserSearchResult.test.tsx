import React from 'react'
import { TouchableOpacity } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { UserSearchResult } from '../UserSearchResult'

const MOCK_USER = { id: 'user-123', display_name: 'Jane Doe', avatar_url: null }

const noop = () => Promise.resolve()

function makeProps(status: 'none' | 'pending_sent' | 'pending_received' | 'accepted') {
  return {
    user: MOCK_USER,
    status,
    onSendRequest: jest.fn().mockResolvedValue(undefined),
    onCancelRequest: jest.fn().mockResolvedValue(undefined),
    onAcceptRequest: jest.fn().mockResolvedValue(undefined),
  }
}

function findButtonWithLabel(root: ReturnType<typeof create>, label: string) {
  const touchables = root.root.findAllByType(TouchableOpacity)
  return touchables.find((n) => {
    const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
    return texts.some((t) => String(t.props.children) === label)
  })
}

describe('UserSearchResult', () => {
  it('renders the display name', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('none')} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Jane Doe')).toBe(true)
  })

  it('shows "Add Friend" button when status is none', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('none')} />) })

    expect(findButtonWithLabel(root!, 'Add Friend')).toBeDefined()
  })

  it('calls onSendRequest when Add Friend is pressed', async () => {
    const props = makeProps('none')
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    await act(async () => {
      findButtonWithLabel(root!, 'Add Friend')!.props.onPress()
    })

    expect(props.onSendRequest).toHaveBeenCalled()
  })

  it('shows "Pending" button when status is pending_sent', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('pending_sent')} />) })

    expect(findButtonWithLabel(root!, 'Pending')).toBeDefined()
  })

  it('pressing "Pending" opens the in-app cancel confirmation modal', () => {
    const props = makeProps('pending_sent')
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    act(() => { findButtonWithLabel(root!, 'Pending')!.props.onPress() })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Cancel request?')).toBe(true)
  })

  it('calls onCancelRequest when "Cancel request" button in modal is pressed', async () => {
    const props = makeProps('pending_sent')
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    act(() => { findButtonWithLabel(root!, 'Pending')!.props.onPress() })

    await act(async () => { findButtonWithLabel(root!, 'Cancel request')!.props.onPress() })

    expect(props.onCancelRequest).toHaveBeenCalled()
  })

  it('"Keep" button closes the modal without calling onCancelRequest', () => {
    const props = makeProps('pending_sent')
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    act(() => { findButtonWithLabel(root!, 'Pending')!.props.onPress() })
    act(() => { findButtonWithLabel(root!, 'Keep')!.props.onPress() })

    expect(props.onCancelRequest).not.toHaveBeenCalled()
  })

  it('shows "Accept" button when status is pending_received', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('pending_received')} />) })

    expect(findButtonWithLabel(root!, 'Accept')).toBeDefined()
  })

  it('calls onAcceptRequest when Accept is pressed', async () => {
    const props = makeProps('pending_received')
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    await act(async () => {
      findButtonWithLabel(root!, 'Accept')!.props.onPress()
    })

    expect(props.onAcceptRequest).toHaveBeenCalled()
  })

  it('shows "Friends" label when status is accepted and button is disabled', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('accepted')} />) })

    const btn = findButtonWithLabel(root!, 'Friends')
    expect(btn).toBeDefined()
    expect(btn!.props.disabled).toBe(true)
  })

  it('renders initials fallback when avatarUrl is null', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...makeProps('none')} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children).match(/^[A-Z]{1,2}$/))
    expect(initialsNode?.props.children).toBe('JD')
  })
})
