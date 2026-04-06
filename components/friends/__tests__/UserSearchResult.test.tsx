import React from 'react'
import { TouchableOpacity, Alert } from 'react-native'
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

  it('shows Alert with cancel option when Pending is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const props = makeProps('pending_sent')

    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    act(() => { findButtonWithLabel(root!, 'Pending')!.props.onPress() })

    expect(alertSpy).toHaveBeenCalledWith(
      'Cancel request?',
      '',
      expect.arrayContaining([
        expect.objectContaining({ style: 'destructive' }),
        expect.objectContaining({ style: 'cancel' }),
      ])
    )
    alertSpy.mockRestore()
  })

  it('calls onCancelRequest when cancel is confirmed in the Alert', async () => {
    const props = makeProps('pending_sent')
    let capturedDestructiveOnPress: (() => void) | undefined

    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const destructive = (buttons as Array<{ style: string; onPress?: () => void }>)
        .find((b) => b.style === 'destructive')
      capturedDestructiveOnPress = destructive?.onPress
    })

    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult {...props} />) })

    act(() => { findButtonWithLabel(root!, 'Pending')!.props.onPress() })

    await act(async () => { capturedDestructiveOnPress?.() })

    expect(props.onCancelRequest).toHaveBeenCalled()
    jest.restoreAllMocks()
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
