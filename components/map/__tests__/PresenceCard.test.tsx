import React from 'react'
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { PresenceCard } from '../PresenceCard'
import { LivePresenceEntry } from '@/hooks/useLivePresences'
import { PresenceJoin } from '@/lib/presenceJoins'

// PresenceBubble renders a native View+Text or Image — no mock needed

const MOCK_PRESENCE: LivePresenceEntry = {
  id: 'p-1',
  userId: 'u-2',
  poiId: 'poi-1',
  displayName: 'Jane Doe',
  avatarUrl: null,
  message: 'grabbing coffee',
}

const MOCK_JOIN: PresenceJoin = {
  id: 'j-1',
  presence_id: 'p-1',
  joiner_user_id: 'u-1',
  joined_at: '2026-01-01T00:00:00Z',
  confirmed: false,
}

const MOCK_JOIN_CONFIRMED: PresenceJoin = {
  ...MOCK_JOIN,
  confirmed: true,
}

function findTexts(root: ReturnType<typeof create>): string[] {
  return root.root
    .findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    .map((n) => String(n.props.children))
}

describe('PresenceCard', () => {
  it('renders display name and message', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts).toContain('Jane Doe')
    expect(texts).toContain('grabbing coffee')
  })

  it('renders Join [firstName] button when not joined', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts.some((t) => t.includes('Join Jane'))).toBe(true)
  })

  it('renders On my way and Cancel when existingJoin is provided', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts).toContain('On my way')
    expect(texts).toContain('Cancel')
  })

  it('calls onJoin with presenceId when Join button is pressed', async () => {
    const onJoin = jest.fn().mockResolvedValue(undefined)

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={onJoin}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const joinButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children).includes('Join'))
    })

    await act(async () => { joinButton!.props.onPress() })

    expect(onJoin).toHaveBeenCalledWith('p-1')
  })

  it('calls onCancel with joinId when Cancel button is pressed', async () => {
    const onCancel = jest.fn().mockResolvedValue(undefined)

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN}
          onJoin={jest.fn()}
          onCancel={onCancel}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const cancelButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Cancel')
    })

    await act(async () => { cancelButton!.props.onPress() })

    expect(onCancel).toHaveBeenCalledWith('j-1')
  })

  it('does not render action button when isOwnPresence is true', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={true}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts.some((t) => t.includes('Join'))).toBe(false)
    expect(texts).not.toContain('Cancel')
    expect(texts).not.toContain('On my way')
  })

  it('shows ActivityIndicator while operation is in progress', async () => {
    let resolveJoin!: () => void
    const onJoin = jest.fn().mockReturnValue(new Promise<void>((r) => { resolveJoin = r }))

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={onJoin}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const joinButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children).includes('Join'))
    })

    act(() => { joinButton!.props.onPress() })

    expect(root!.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0)

    // Clean up
    await act(async () => { resolveJoin() })
  })

  it('shows ActivityIndicator while cancel is in progress', async () => {
    let resolveCancel!: () => void
    const onCancel = jest.fn().mockReturnValue(new Promise<void>((r) => { resolveCancel = r }))

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN}
          onJoin={jest.fn()}
          onCancel={onCancel}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const cancelButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Cancel')
    })

    act(() => { cancelButton!.props.onPress() })

    expect(root!.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0)

    // Clean up
    await act(async () => { resolveCancel() })
  })

  it('does not render message text when message is null', () => {
    const presence: LivePresenceEntry = { ...MOCK_PRESENCE, message: null }

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={presence}
          existingJoin={undefined}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    // displayName is still shown, but no message line
    expect(texts).toContain('Jane Doe')
    expect(texts.filter((t) => t === 'grabbing coffee').length).toBe(0)
  })

  it('shows inline error and resets busy when onJoin rejects', async () => {
    const onJoin = jest.fn().mockRejectedValue(new Error('network failure'))

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={onJoin}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const joinButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children).includes('Join'))
    })

    await act(async () => { joinButton!.props.onPress() })

    // busy resets to false — ActivityIndicator should be gone
    expect(root!.root.findAllByType(ActivityIndicator).length).toBe(0)
    // error shown inline
    const errorNode = root!.root
      .findAllByType(Text)
      .find((n: ReactTestInstance) => String(n.props.children).includes('Could not join'))
    expect(errorNode).toBeDefined()
  })

  it('shows already-joined message inline when error includes "already joined"', async () => {
    const onJoin = jest.fn().mockRejectedValue(new Error('You have already joined this person.'))

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={undefined}
          onJoin={onJoin}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const joinButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children).includes('Join'))
    })

    await act(async () => { joinButton!.props.onPress() })

    const errorNode = root!.root
      .findAllByType(Text)
      .find((n: ReactTestInstance) => String(n.props.children) === 'You have already joined this person.')
    expect(errorNode).toBeDefined()
  })

  it('renders Arrived when existingJoin is confirmed', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN_CONFIRMED}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts).toContain('Arrived')
    expect(texts).not.toContain('On my way')
    expect(texts).not.toContain('Cancel')
    expect(texts.some((t) => t.includes('Join'))).toBe(false)
  })

  it('renders no action buttons when confirmed join exists', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN_CONFIRMED}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts.some((t) => t.includes('Join'))).toBe(false)
    expect(texts).not.toContain('Cancel')
    expect(texts).not.toContain('On my way')
  })

  it('still renders On my way state when existingJoin is unconfirmed', () => {
    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={MOCK_PRESENCE}
          existingJoin={MOCK_JOIN}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts).toContain('On my way')
    expect(texts).toContain('Cancel')
    expect(texts).not.toContain('Arrived')
  })

  it('extracts first name for Join button label', () => {
    const presence: LivePresenceEntry = {
      ...MOCK_PRESENCE,
      displayName: 'Alice Bob Carol',
    }

    let root: ReturnType<typeof create>
    act(() => {
      root = create(
        <PresenceCard
          presence={presence}
          existingJoin={undefined}
          onJoin={jest.fn()}
          onCancel={jest.fn()}
          isOwnPresence={false}
        />
      )
    })

    const texts = findTexts(root!)
    expect(texts.some((t) => t === 'Join Alice')).toBe(true)
  })
})
