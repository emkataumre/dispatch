import React from 'react'
import { act, create } from 'react-test-renderer'

const mockUseAuth = jest.fn()
const mockFetchFriendships = jest.fn()
const mockLibSendRequest = jest.fn()
const mockLibCancelRequest = jest.fn()
const mockLibAcceptRequest = jest.fn()
const mockLibDeclineRequest = jest.fn()
const mockLibUnfriend = jest.fn()

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
}
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
  },
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@/lib/friendships', () => ({
  fetchFriendships: (...args: unknown[]) => mockFetchFriendships(...args),
  sendRequest: (...args: unknown[]) => mockLibSendRequest(...args),
  cancelRequest: (...args: unknown[]) => mockLibCancelRequest(...args),
  acceptRequest: (...args: unknown[]) => mockLibAcceptRequest(...args),
  declineRequest: (...args: unknown[]) => mockLibDeclineRequest(...args),
  unfriend: (...args: unknown[]) => mockLibUnfriend(...args),
}))

import { useFriendships } from '../useFriendships'

type HookResult<T> = { current: T }

function renderHook<T>(useHook: () => T): { result: HookResult<T>; unmount: () => void } {
  const result: HookResult<T> = { current: undefined as unknown as T }
  let root: ReturnType<typeof create>
  function TestComponent() {
    result.current = useHook()
    return null
  }
  act(() => { root = create(React.createElement(TestComponent)) })
  return { result, unmount: () => act(() => { root.unmount() }) }
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

const USER_ID = 'user-me'
const OTHER_ID = 'user-other'
const FRIEND_ID = 'user-friend'

const PENDING_SENT_ROW = {
  id: 'fs-pending-sent',
  requester_id: USER_ID,
  addressee_id: OTHER_ID,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  requester: { id: USER_ID, display_name: 'Me', avatar_url: null },
  addressee: { id: OTHER_ID, display_name: 'Other', avatar_url: null },
}

const PENDING_RECEIVED_ROW = {
  id: 'fs-pending-received',
  requester_id: OTHER_ID,
  addressee_id: USER_ID,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  requester: { id: OTHER_ID, display_name: 'Other', avatar_url: null },
  addressee: { id: USER_ID, display_name: 'Me', avatar_url: null },
}

const ACCEPTED_ROW = {
  id: 'fs-accepted',
  requester_id: USER_ID,
  addressee_id: FRIEND_ID,
  status: 'accepted',
  created_at: '2026-01-01T00:00:00Z',
  requester: { id: USER_ID, display_name: 'Me', avatar_url: null },
  addressee: { id: FRIEND_ID, display_name: 'Friend', avatar_url: null },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { user: { id: USER_ID } } })
})

describe('useFriendships', () => {
  it('returns empty state when no friendships exist', async () => {
    mockFetchFriendships.mockResolvedValue([])
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.friends).toEqual([])
    expect(result.current.incomingRequests).toEqual([])
    expect(result.current.outgoingRequestMap.size).toBe(0)
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.loading).toBe(false)
  })

  it('correctly derives friends from accepted rows', async () => {
    mockFetchFriendships.mockResolvedValue([ACCEPTED_ROW])
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.friends).toHaveLength(1)
    expect(result.current.friends[0].userId).toBe(FRIEND_ID)
    expect(result.current.friends[0].displayName).toBe('Friend')
    expect(result.current.friends[0].friendshipId).toBe('fs-accepted')
  })

  it('correctly derives incomingRequests from pending-received rows', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_RECEIVED_ROW])
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.incomingRequests).toHaveLength(1)
    expect(result.current.incomingRequests[0].requesterId).toBe(OTHER_ID)
    expect(result.current.incomingRequests[0].displayName).toBe('Other')
    expect(result.current.pendingCount).toBe(1)
  })

  it('correctly populates outgoingRequestMap from pending-sent rows', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_SENT_ROW])
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(true)
    expect(result.current.outgoingRequestMap.get(OTHER_ID)).toBe('fs-pending-sent')
    expect(result.current.incomingRequests).toHaveLength(0)
  })

  it('sets error state when fetchFriendships throws', async () => {
    mockFetchFriendships.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.error).toBe('network error')
    expect(result.current.loading).toBe(false)
  })

  it('returns empty state when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ session: null })
    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.friends).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockFetchFriendships).not.toHaveBeenCalled()
  })

  it('sendRequest: optimistically adds to outgoingRequestMap and confirms on success', async () => {
    mockFetchFriendships.mockResolvedValue([])
    mockLibSendRequest.mockResolvedValue({ ...PENDING_SENT_ROW, id: 'fs-new' })

    const { result } = renderHook(() => useFriendships())
    await flush()

    await act(async () => { await result.current.sendRequest(OTHER_ID) })

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(true)
  })

  it('sendRequest: rolls back optimistic add on error', async () => {
    mockFetchFriendships.mockResolvedValue([])
    mockLibSendRequest.mockRejectedValue(new Error('Friend request already exists'))

    const { result } = renderHook(() => useFriendships())
    await flush()

    await expect(
      act(async () => { await result.current.sendRequest(OTHER_ID) })
    ).rejects.toThrow('Friend request already exists')

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(false)
  })

  it('cancelRequest: removes from outgoingRequestMap on success', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_SENT_ROW])
    mockLibCancelRequest.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(true)

    await act(async () => { await result.current.cancelRequest('fs-pending-sent') })

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(false)
  })

  it('cancelRequest: rolls back on error', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_SENT_ROW])
    mockLibCancelRequest.mockRejectedValue(new Error('Request not found or already cancelled'))

    const { result } = renderHook(() => useFriendships())
    await flush()

    await expect(
      act(async () => { await result.current.cancelRequest('fs-pending-sent') })
    ).rejects.toThrow()

    expect(result.current.outgoingRequestMap.has(OTHER_ID)).toBe(true)
  })

  it('acceptRequest: moves row from incomingRequests to friends', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_RECEIVED_ROW])
    mockLibAcceptRequest.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.incomingRequests).toHaveLength(1)
    expect(result.current.friends).toHaveLength(0)

    await act(async () => { await result.current.acceptRequest('fs-pending-received') })

    expect(result.current.incomingRequests).toHaveLength(0)
    expect(result.current.friends).toHaveLength(1)
    expect(result.current.pendingCount).toBe(0)
  })

  it('acceptRequest: rolls back on error', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_RECEIVED_ROW])
    mockLibAcceptRequest.mockRejectedValue(new Error('update failed'))

    const { result } = renderHook(() => useFriendships())
    await flush()

    await expect(
      act(async () => { await result.current.acceptRequest('fs-pending-received') })
    ).rejects.toThrow()

    expect(result.current.incomingRequests).toHaveLength(1)
  })

  it('declineRequest: removes from incomingRequests on success', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_RECEIVED_ROW])
    mockLibDeclineRequest.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFriendships())
    await flush()

    await act(async () => { await result.current.declineRequest('fs-pending-received') })

    expect(result.current.incomingRequests).toHaveLength(0)
  })

  it('declineRequest: rolls back on error', async () => {
    mockFetchFriendships.mockResolvedValue([PENDING_RECEIVED_ROW])
    mockLibDeclineRequest.mockRejectedValue(new Error('not found'))

    const { result } = renderHook(() => useFriendships())
    await flush()

    await expect(
      act(async () => { await result.current.declineRequest('fs-pending-received') })
    ).rejects.toThrow()

    expect(result.current.incomingRequests).toHaveLength(1)
  })

  it('unfriend: removes from friends on success', async () => {
    mockFetchFriendships.mockResolvedValue([ACCEPTED_ROW])
    mockLibUnfriend.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(result.current.friends).toHaveLength(1)

    await act(async () => { await result.current.unfriend('fs-accepted') })

    expect(result.current.friends).toHaveLength(0)
  })

  it('unfriend: rolls back on error', async () => {
    mockFetchFriendships.mockResolvedValue([ACCEPTED_ROW])
    mockLibUnfriend.mockRejectedValue(new Error('Friendship not found'))

    const { result } = renderHook(() => useFriendships())
    await flush()

    await expect(
      act(async () => { await result.current.unfriend('fs-accepted') })
    ).rejects.toThrow()

    expect(result.current.friends).toHaveLength(1)
  })

  it('does not log or set error when CLOSED fires after cleanup (background/unmount)', async () => {
    mockFetchFriendships.mockResolvedValue([])

    const { result, unmount } = renderHook(() => useFriendships())
    await flush()

    const statusHandler = mockChannel.subscribe.mock.calls[0][0] as (status: string, err?: Error) => void
    act(() => { statusHandler('SUBSCRIBED') })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    // Unmount sets active=false; then CLOSED fires (as it does via removeChannel in prod)
    unmount()
    act(() => { statusHandler('CLOSED') })

    expect(consoleSpy).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
    consoleSpy.mockRestore()
  })

  it('refetches and clears error after CHANNEL_ERROR + SUBSCRIBED reconnect', async () => {
    mockFetchFriendships.mockResolvedValue([])

    const { result } = renderHook(() => useFriendships())
    await flush()

    expect(mockFetchFriendships).toHaveBeenCalledTimes(1)

    const statusHandler = mockChannel.subscribe.mock.calls[0][0] as (status: string, err?: Error) => void

    // Initial SUBSCRIBED — marks channel as subscribed-once, no refetch
    act(() => { statusHandler('SUBSCRIBED') })
    expect(mockFetchFriendships).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()

    // Channel error — sets sticky error state
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    act(() => { statusHandler('CHANNEL_ERROR') })
    expect(result.current.error).not.toBeNull()
    consoleSpy.mockRestore()

    // Reconnect — should re-fetch and clear error
    await act(async () => { statusHandler('SUBSCRIBED') })
    await flush()

    expect(mockFetchFriendships).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
  })
})
