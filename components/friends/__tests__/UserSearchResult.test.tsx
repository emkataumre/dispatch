import React from 'react'
import { TouchableOpacity } from 'react-native'
import { act, create, ReactTestInstance } from 'react-test-renderer'
import { UserSearchResult } from '../UserSearchResult'

const MOCK_USER = {
  id: 'user-123',
  display_name: 'Jane Doe',
  avatar_url: null,
}

describe('UserSearchResult', () => {
  it('renders the display name', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult user={MOCK_USER} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const nameNode = texts.find((n) => String(n.props.children) === 'Jane Doe')
    expect(nameNode).toBeDefined()
  })

  it('renders an Add Friend button', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult user={MOCK_USER} />) })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const addButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Add Friend')
    })
    expect(addButton).toBeDefined()
  })

  it('logs Friend stub to console when Add Friend is pressed', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult user={MOCK_USER} />) })

    const touchables = root!.root.findAllByType(TouchableOpacity)
    const addButton = touchables.find((n) => {
      const texts = n.findAll((c: ReactTestInstance) => (c.type as string) === 'Text')
      return texts.some((t) => String(t.props.children) === 'Add Friend')
    })

    act(() => { addButton!.props.onPress() })

    expect(consoleSpy).toHaveBeenCalledWith('[Friend stub]', MOCK_USER.id, MOCK_USER.display_name)
    consoleSpy.mockRestore()
  })

  it('renders without avatar (null avatarUrl) using initials fallback', () => {
    let root: ReturnType<typeof create>
    act(() => { root = create(<UserSearchResult user={MOCK_USER} />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const initialsNode = texts.find((n) => String(n.props.children).match(/^[A-Z]{1,2}$/))
    expect(initialsNode?.props.children).toBe('JD')
  })
})
