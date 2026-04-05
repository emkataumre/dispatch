import { joinPresence, cancelJoin } from '../presenceJoins'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const MOCK_USER_ID = 'user-123'
const MOCK_PRESENCE_ID = 'presence-456'
const MOCK_JOIN_ID = 'join-789'

const MOCK_JOIN_ROW = {
  id: MOCK_JOIN_ID,
  presence_id: MOCK_PRESENCE_ID,
  joiner_user_id: MOCK_USER_ID,
  joined_at: '2026-01-01T00:00:00Z',
  confirmed: false,
}

type MockSupabase = {
  from: jest.Mock
  auth: { getUser: jest.Mock }
}

function makeJoinMock({
  insertResult = { data: MOCK_JOIN_ROW, error: null },
}: {
  insertResult?: { data: typeof MOCK_JOIN_ROW | null; error: { message: string; code?: string } | null }
} = {}): MockSupabase {
  const single = jest.fn().mockResolvedValue(insertResult)
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  const from = jest.fn().mockReturnValue({ insert })
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  })
  return { from, auth: { getUser } }
}

function makeCancelMock({
  deleteResult = { count: 1, error: null },
}: {
  deleteResult?: { count: number | null; error: { message: string } | null }
} = {}): MockSupabase {
  const eqUser = jest.fn().mockResolvedValue(deleteResult)
  const eqId = jest.fn().mockReturnValue({ eq: eqUser })
  const del = jest.fn().mockReturnValue({ eq: eqId })
  const from = jest.fn().mockReturnValue({ delete: del })
  const getUser = jest.fn().mockResolvedValue({
    data: { user: { id: MOCK_USER_ID } },
    error: null,
  })
  return { from, auth: { getUser } }
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>
}

describe('joinPresence', () => {
  it('inserts with correct fields', async () => {
    const mock = makeJoinMock()
    await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })

    expect(mock.from).toHaveBeenCalledWith('presence_joins')
    const fromInstance = mock.from.mock.results[0].value
    expect(fromInstance.insert).toHaveBeenCalledWith({
      presence_id: MOCK_PRESENCE_ID,
      joiner_user_id: MOCK_USER_ID,
    })
  })

  it('returns the created join row', async () => {
    const mock = makeJoinMock()
    const result = await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    expect(result).toEqual(MOCK_JOIN_ROW)
  })

  it('throws when user is not authenticated', async () => {
    const mock = makeJoinMock()
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(
      joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    ).rejects.toThrow('Not authenticated')
  })

  it('throws when getUser returns an auth error even with user present', async () => {
    const mock = makeJoinMock()
    mock.auth.getUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: { message: 'session expired' },
    })
    await expect(
      joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    ).rejects.toThrow('Not authenticated')
  })

  it('throws user-friendly message on unique constraint violation', async () => {
    const mock = makeJoinMock({
      insertResult: { data: null, error: { message: 'duplicate key value', code: '23505' } },
    })
    await expect(
      joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    ).rejects.toThrow('You have already joined this person.')
  })

  it('throws with Supabase error message when insert fails with other error', async () => {
    const mock = makeJoinMock({
      insertResult: { data: null, error: { message: 'insert failed' } },
    })
    await expect(
      joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    ).rejects.toThrow('insert failed')
  })

  it('logs push notification stub', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const mock = makeJoinMock()
    await joinPresence(asClient(mock), { presenceId: MOCK_PRESENCE_ID })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Push stub'))
    spy.mockRestore()
  })
})

describe('cancelJoin', () => {
  it('deletes with correct joinId and user filter', async () => {
    const mock = makeCancelMock()
    await cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })

    expect(mock.from).toHaveBeenCalledWith('presence_joins')
    const fromInstance = mock.from.mock.results[0].value
    expect(fromInstance.delete).toHaveBeenCalled()

    const deleteResult = fromInstance.delete.mock.results[0].value
    expect(deleteResult.eq).toHaveBeenCalledWith('id', MOCK_JOIN_ID)

    const firstEqResult = deleteResult.eq.mock.results[0].value
    expect(firstEqResult.eq).toHaveBeenCalledWith('joiner_user_id', MOCK_USER_ID)
  })

  it('throws when user is not authenticated', async () => {
    const mock = makeCancelMock()
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(
      cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })
    ).rejects.toThrow('Not authenticated')
  })

  it('throws when getUser returns an auth error even with user present', async () => {
    const mock = makeCancelMock()
    mock.auth.getUser.mockResolvedValue({
      data: { user: { id: MOCK_USER_ID } },
      error: { message: 'session expired' },
    })
    await expect(
      cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })
    ).rejects.toThrow('Not authenticated')
  })

  it('throws with Supabase error message when delete fails', async () => {
    const mock = makeCancelMock({
      deleteResult: { count: null, error: { message: 'delete failed' } },
    })
    await expect(
      cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })
    ).rejects.toThrow('delete failed')
  })

  it('throws when join is not found (zero rows deleted)', async () => {
    const mock = makeCancelMock({ deleteResult: { count: 0, error: null } })
    await expect(
      cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })
    ).rejects.toThrow('Join not found or already cancelled')
  })

  it('logs push notification stub', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const mock = makeCancelMock()
    await cancelJoin(asClient(mock), { joinId: MOCK_JOIN_ID })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Push stub'))
    spy.mockRestore()
  })
})
