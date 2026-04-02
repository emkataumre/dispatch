import { submitRating } from '../ratings'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const MOCK_USER_ID = 'user-456'

type MockSupabase = {
  from: jest.Mock
  insert: jest.Mock
  auth: { getUser: jest.Mock }
}

function makeMockSupabase(insertResult: { error: { message: string; code?: string } | null }): MockSupabase {
  const insert = jest.fn().mockResolvedValue(insertResult)
  const from = jest.fn().mockReturnValue({ insert })
  const getUser = jest.fn().mockResolvedValue({ data: { user: { id: MOCK_USER_ID } }, error: null })
  return { from, insert, auth: { getUser } }
}

function asClient(mock: MockSupabase): SupabaseClient<Database> {
  return mock as unknown as SupabaseClient<Database>
}

describe('submitRating', () => {
  const baseArgs = { poiId: 'poi-123', rating: 4, comment: 'Great spot!' }

  it('inserts the correct fields', async () => {
    const mock = makeMockSupabase({ error: null })
    await submitRating(asClient(mock), baseArgs)

    expect(mock.from).toHaveBeenCalledWith('poi_ratings')
    expect(mock.insert).toHaveBeenCalledWith({
      poi_id: 'poi-123',
      user_id: MOCK_USER_ID,
      rating: 4,
      comment: 'Great spot!',
    })
  })

  it('succeeds when rating is 1 (lower boundary)', async () => {
    const mock = makeMockSupabase({ error: null })
    await expect(submitRating(asClient(mock), { ...baseArgs, rating: 1 })).resolves.not.toThrow()
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ rating: 1 }))
  })

  it('succeeds when rating is 5 (upper boundary)', async () => {
    const mock = makeMockSupabase({ error: null })
    await expect(submitRating(asClient(mock), { ...baseArgs, rating: 5 })).resolves.not.toThrow()
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ rating: 5 }))
  })

  it('passes null comment when comment is an empty string', async () => {
    const mock = makeMockSupabase({ error: null })
    await submitRating(asClient(mock), { ...baseArgs, comment: '' })

    expect(mock.insert).toHaveBeenCalledWith({
      poi_id: 'poi-123',
      user_id: MOCK_USER_ID,
      rating: 4,
      comment: null,
    })
  })

  it('passes null comment when comment is only whitespace', async () => {
    const mock = makeMockSupabase({ error: null })
    await submitRating(asClient(mock), { ...baseArgs, comment: '   ' })

    expect(mock.insert).toHaveBeenCalledWith({
      poi_id: 'poi-123',
      user_id: MOCK_USER_ID,
      rating: 4,
      comment: null,
    })
  })

  it('passes null comment when comment is omitted', async () => {
    const mock = makeMockSupabase({ error: null })
    await submitRating(asClient(mock), { poiId: 'poi-123', rating: 4 })

    expect(mock.insert).toHaveBeenCalledWith({
      poi_id: 'poi-123',
      user_id: MOCK_USER_ID,
      rating: 4,
      comment: null,
    })
  })

  it('throws when rating is below 1', async () => {
    const mock = makeMockSupabase({ error: null })
    await expect(
      submitRating(asClient(mock), { ...baseArgs, rating: 0 })
    ).rejects.toThrow('Rating must be between 1 and 5')
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('throws when rating is above 5', async () => {
    const mock = makeMockSupabase({ error: null })
    await expect(
      submitRating(asClient(mock), { ...baseArgs, rating: 6 })
    ).rejects.toThrow('Rating must be between 1 and 5')
    expect(mock.from).not.toHaveBeenCalled()
  })

  it('throws with the Supabase error message when insert fails', async () => {
    const mock = makeMockSupabase({ error: { message: 'duplicate key violation', code: '23505' } })
    await expect(
      submitRating(asClient(mock), baseArgs)
    ).rejects.toThrow('duplicate key violation')
    expect(mock.from).toHaveBeenCalledWith('poi_ratings')
    expect(mock.insert).toHaveBeenCalled()
  })
})
