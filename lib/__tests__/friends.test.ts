import { searchUsers } from '../friends'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const MOCK_USER_ID = 'user-123'

const MOCK_RESULTS = [
  { id: 'user-456', display_name: 'Jane Doe', avatar_url: null },
  { id: 'user-789', display_name: 'James Smith', avatar_url: 'https://example.com/avatar.png' },
]

type MockSupabase = {
  from: jest.Mock
  auth: { getUser: jest.Mock }
}

function makeMockSupabase({
  queryResult = { data: MOCK_RESULTS, error: null },
  getUserResult = { data: { user: { id: MOCK_USER_ID } }, error: null },
}: {
  queryResult?: { data: typeof MOCK_RESULTS | null; error: { message: string } | null }
  getUserResult?: { data: { user: { id: string } | null }; error: { message: string } | null }
} = {}): MockSupabase {
  const limit = jest.fn().mockResolvedValue(queryResult)
  const neq = jest.fn().mockReturnValue({ limit })
  const ilike = jest.fn().mockReturnValue({ neq })
  const select = jest.fn().mockReturnValue({ ilike })
  const from = jest.fn().mockReturnValue({ select })
  const getUser = jest.fn().mockResolvedValue(getUserResult)

  return { from, auth: { getUser } }
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>
}

describe('searchUsers', () => {
  it('queries profiles with correct ilike pattern and excludes self', async () => {
    const mock = makeMockSupabase()
    await searchUsers(asClient(mock), { query: 'Jane' })

    expect(mock.from).toHaveBeenCalledWith('profiles')
    const fromInstance = mock.from.mock.results[0].value
    expect(fromInstance.select).toHaveBeenCalledWith('id, display_name, avatar_url')
    const selectInstance = fromInstance.select.mock.results[0].value
    expect(selectInstance.ilike).toHaveBeenCalledWith('display_name', 'Jane%')
    const ilikeInstance = selectInstance.ilike.mock.results[0].value
    expect(ilikeInstance.neq).toHaveBeenCalledWith('id', MOCK_USER_ID)
    const neqInstance = ilikeInstance.neq.mock.results[0].value
    expect(neqInstance.limit).toHaveBeenCalledWith(20)
  })

  it('returns data array on success', async () => {
    const mock = makeMockSupabase()
    const results = await searchUsers(asClient(mock), { query: 'Jane' })
    expect(results).toEqual(MOCK_RESULTS)
  })

  it('returns empty array when data is null but no error', async () => {
    const mock = makeMockSupabase({ queryResult: { data: null, error: null } })
    const results = await searchUsers(asClient(mock), { query: 'Jane' })
    expect(results).toEqual([])
  })

  it('throws Not authenticated when getUser returns no user', async () => {
    const mock = makeMockSupabase({
      getUserResult: { data: { user: null }, error: null },
    })
    await expect(searchUsers(asClient(mock), { query: 'Jane' })).rejects.toThrow('Not authenticated')
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('throws Not authenticated when getUser returns an error', async () => {
    const mock = makeMockSupabase({
      getUserResult: { data: { user: null }, error: { message: 'auth error' } },
    })
    await expect(searchUsers(asClient(mock), { query: 'Jane' })).rejects.toThrow('Not authenticated')
  })

  it('throws Supabase error message on query failure', async () => {
    const mock = makeMockSupabase({
      queryResult: { data: null, error: { message: 'network failure' } },
    })
    await expect(searchUsers(asClient(mock), { query: 'Jane' })).rejects.toThrow('network failure')
  })
})
