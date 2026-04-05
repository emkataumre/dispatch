import React from 'react'
import { ActivityIndicator, TouchableOpacity } from 'react-native'
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
