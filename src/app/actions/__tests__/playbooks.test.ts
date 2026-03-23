import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockSingle = vi.fn()
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}))
const mockGetUser = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createPlaybook, updatePlaybook, deletePlaybook } from '../playbooks'

const validRule = {
  id: 'rule-1',
  category: 'entry' as const,
  description: 'IV rank > 50%でエントリー',
}

const validCreateInput = {
  name: 'テスト戦略',
  rules: [validRule],
}

const validUpdateInput = {
  name: '更新された戦略',
  rules: [validRule],
}

function mockAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  })
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createPlaybook', () => {
  it('returns validation error for invalid input', async () => {
    const result = await createPlaybook({ name: '' })
    expect(result.success).toBe(false)
  })

  it('returns validation error when rules are empty', async () => {
    const result = await createPlaybook({ name: 'test', rules: [] })
    expect(result.success).toBe(false)
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await createPlaybook(validCreateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('creates playbook and returns success with id', async () => {
    mockAuthenticatedUser()
    mockSingle.mockResolvedValue({ data: { id: 'pb-123' }, error: null })

    const result = await createPlaybook(validCreateInput)
    expect(result).toEqual({ success: true, id: 'pb-123' })
    expect(mockFrom).toHaveBeenCalledWith('playbooks')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'テスト戦略',
        user_id: 'user-123',
      }),
    )
  })

  it('returns DB error on insert failure', async () => {
    mockAuthenticatedUser()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await createPlaybook(validCreateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB error')
    }
  })
})

describe('updatePlaybook', () => {
  it('returns error when id is empty', async () => {
    const result = await updatePlaybook('', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Playbook IDが指定されていません')
    }
  })

  it('returns validation error for invalid input', async () => {
    const result = await updatePlaybook('pb-1', { name: '', rules: [] })
    expect(result.success).toBe(false)
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await updatePlaybook('pb-1', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('updates playbook and returns success', async () => {
    mockAuthenticatedUser()
    mockUpdateEq.mockResolvedValue({ error: null })

    const result = await updatePlaybook('pb-1', validUpdateInput)
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('playbooks')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '更新された戦略',
      }),
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'pb-1')
  })

  it('returns DB error on update failure', async () => {
    mockAuthenticatedUser()
    mockUpdateEq.mockResolvedValue({ error: { message: 'update failed' } })

    const result = await updatePlaybook('pb-1', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('update failed')
    }
  })
})

describe('deletePlaybook', () => {
  it('returns error when id is empty', async () => {
    const result = await deletePlaybook('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Playbook IDが指定されていません')
    }
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await deletePlaybook('pb-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('deletes playbook and returns success', async () => {
    mockAuthenticatedUser()
    mockDeleteEq.mockResolvedValue({ error: null })

    const result = await deletePlaybook('pb-1')
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('playbooks')
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'pb-1')
  })

  it('returns DB error on delete failure', async () => {
    mockAuthenticatedUser()
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const result = await deletePlaybook('pb-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('delete failed')
    }
  })
})
