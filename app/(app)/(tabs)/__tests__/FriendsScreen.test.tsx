import React from 'react'
import { act, create, ReactTestInstance } from 'react-test-renderer'

const mockUseUserSearch = jest.fn()

jest.mock('@/hooks/useUserSearch', () => ({
  useUserSearch: (...args: unknown[]) => mockUseUserSearch(...args),
}))

jest.mock('@/components/friends/UserSearchResult', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    UserSearchResult: ({ user }: { user: { display_name: string } }) =>
      React.createElement(Text, null, user.display_name),
  }
})

import FriendsScreen from '../friends'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('FriendsScreen', () => {
  it('renders a search input', () => {
    mockUseUserSearch.mockReturnValue({ results: [], state: 'idle', error: null })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const inputs = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'TextInput')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('shows idle hint text when state is idle', () => {
    mockUseUserSearch.mockReturnValue({ results: [], state: 'idle', error: null })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const hint = texts.find((n) => String(n.props.children) === 'Search for friends by name')
    expect(hint).toBeDefined()
  })

  it('shows ActivityIndicator when state is searching', () => {
    mockUseUserSearch.mockReturnValue({ results: [], state: 'searching', error: null })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const spinners = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'ActivityIndicator')
    expect(spinners.length).toBeGreaterThan(0)
  })

  it('shows No users found when state is results with empty array', () => {
    mockUseUserSearch.mockReturnValue({ results: [], state: 'results', error: null })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const msg = texts.find((n) => String(n.props.children) === 'No users found')
    expect(msg).toBeDefined()
  })

  it('renders result rows when state is results with data', () => {
    mockUseUserSearch.mockReturnValue({
      results: [
        { id: 'u-1', display_name: 'Jane Doe', avatar_url: null },
        { id: 'u-2', display_name: 'James Smith', avatar_url: null },
      ],
      state: 'results',
      error: null,
    })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    expect(texts.some((n) => String(n.props.children) === 'Jane Doe')).toBe(true)
    expect(texts.some((n) => String(n.props.children) === 'James Smith')).toBe(true)
  })

  it('shows error text when state is error', () => {
    mockUseUserSearch.mockReturnValue({ results: [], state: 'error', error: 'network failure' })

    let root: ReturnType<typeof create>
    act(() => { root = create(<FriendsScreen />) })

    const texts = root!.root.findAll((n: ReactTestInstance) => (n.type as string) === 'Text')
    const errMsg = texts.find((n) => String(n.props.children) === 'network failure')
    expect(errMsg).toBeDefined()
  })
})
