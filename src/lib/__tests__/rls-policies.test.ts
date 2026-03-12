import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const schemaSQL = readFileSync(
  join(process.cwd(), 'supabase/schema.sql'),
  'utf-8'
)

describe('RLSポリシー定義（supabase/schema.sql）', () => {
  describe('tradesテーブル', () => {
    it('RLSが有効化されている', () => {
      expect(schemaSQL).toContain('alter table trades enable row level security')
    })

    it('SELECTポリシーが定義されている（自分のトレードのみ参照可能）', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on trades[\s\S]*?for select/i)
      expect(schemaSQL).toContain('auth.uid() = user_id')
    })

    it('INSERTポリシーが定義されている', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on trades[\s\S]*?for insert/i)
    })

    it('UPDATEポリシーが定義されている', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on trades[\s\S]*?for update/i)
    })

    it('DELETEポリシーが定義されている', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on trades[\s\S]*?for delete/i)
    })
  })

  describe('iv_historyテーブル', () => {
    it('RLSが有効化されている', () => {
      expect(schemaSQL).toContain('alter table iv_history enable row level security')
    })

    it('SELECTポリシーが定義されている（全員参照可能）', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on iv_history[\s\S]*?for select/i)
    })
  })

  describe('user_preferencesテーブル', () => {
    it('RLSが有効化されている', () => {
      expect(schemaSQL).toContain('alter table user_preferences enable row level security')
    })

    it('SELECTポリシーが定義されている', () => {
      expect(schemaSQL).toMatch(/create policy[\s\S]*?on user_preferences[\s\S]*?for select/i)
    })
  })
})
