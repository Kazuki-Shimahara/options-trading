import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Server側のSupabaseクライアント使用を検証するテスト
 *
 * Server Components / API Routes で匿名クライアント（@/lib/supabase）を使うと
 * RLSが正しく適用されない。Server側ではcreateServerSupabaseClientを使う必要がある。
 *
 * Client Components ('use client') はブラウザクライアント（createBrowserSupabaseClient）を使うべき。
 */

const SERVER_FILES_WITH_DIRECT_CLIENT = [
  'src/app/trades/page.tsx',
  'src/app/trades/[id]/page.tsx',
  'src/app/analytics/page.tsx',
  'src/app/api/trades/export/route.ts',
]

const SERVER_FILES_WITH_SERVER_HELPER = [
  'src/app/page.tsx',
]

const CLIENT_COMPONENT_FILES = [
  'src/app/trades/[id]/edit/page.tsx',
  'src/app/settings/page.tsx',
]

function readFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf-8')
}

describe('Server側Supabaseクライアントの統一', () => {
  for (const filePath of SERVER_FILES_WITH_DIRECT_CLIENT) {
    describe(filePath, () => {
      it('匿名クライアント（@/lib/supabase）をインポートしていない', () => {
        const content = readFile(filePath)
        expect(content).not.toMatch(/^['"]use client['"]/)
        expect(content).not.toMatch(/from ['"]@\/lib\/supabase['"]/)
      })

      it('createServerSupabaseClientを使用している', () => {
        const content = readFile(filePath)
        expect(content).toContain('createServerSupabaseClient')
      })
    })
  }

  for (const filePath of SERVER_FILES_WITH_SERVER_HELPER) {
    describe(filePath, () => {
      it('匿名クライアント（@/lib/supabase）をインポートしていない', () => {
        const content = readFile(filePath)
        expect(content).not.toMatch(/^['"]use client['"]/)
        expect(content).not.toMatch(/from ['"]@\/lib\/supabase['"]/)
      })

      it('サーバー用ヘルパー（@/lib/supabase-server）を使用している', () => {
        const content = readFile(filePath)
        expect(content).toContain('@/lib/supabase-server')
      })
    })
  }

  describe('src/lib/supabase-server.ts', () => {
    it('createServerSupabaseClientを使用している', () => {
      const content = readFile('src/lib/supabase-server.ts')
      expect(content).toContain('createServerSupabaseClient')
    })
  })
})

describe('Client ComponentsのSupabaseクライアント', () => {
  for (const filePath of CLIENT_COMPONENT_FILES) {
    describe(filePath, () => {
      it('匿名クライアント（@/lib/supabase）をインポートしていない', () => {
        const content = readFile(filePath)
        expect(content).not.toMatch(/from ['"]@\/lib\/supabase['"]/)
      })

      it('createBrowserSupabaseClientを使用している', () => {
        const content = readFile(filePath)
        expect(content).toContain('createBrowserSupabaseClient')
      })
    })
  }
})
