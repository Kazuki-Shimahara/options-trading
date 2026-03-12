import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// actions/trades.ts のソースコードを読んで user_id 対応を検証
const actionsSource = readFileSync(
  join(process.cwd(), 'src/app/actions/trades.ts'),
  'utf-8'
)

// types/database.ts のソースを読んで user_id 必須化を検証
const typesSource = readFileSync(
  join(process.cwd(), 'src/types/database.ts'),
  'utf-8'
)

describe('ユーザーごとのデータ管理', () => {
  describe('actions/trades.ts', () => {
    it('createTrade で user_id: null をハードコードしていない', () => {
      expect(actionsSource).not.toContain('user_id: null')
    })

    it('createTrade でサーバーサイドの認証クライアントを使用している', () => {
      expect(actionsSource).toContain('createServerSupabaseClient')
    })

    it('createTrade で auth.getUser() からユーザーIDを取得している', () => {
      expect(actionsSource).toContain('getUser')
    })
  })

  describe('types/database.ts', () => {
    it('Trade の user_id が string 型（null不可）になっている', () => {
      // user_id: string（null許容なし）であることを確認
      expect(typesSource).toMatch(/user_id:\s*string(?!\s*\|\s*null)/)
    })
  })
})
