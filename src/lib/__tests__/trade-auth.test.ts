import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const actionsSource = readFileSync(
  join(process.cwd(), 'src/app/actions/trades.ts'),
  'utf-8'
)

// Extract function bodies for targeted checks
function extractFunctionBody(source: string, funcName: string): string {
  const pattern = new RegExp(
    `export\\s+async\\s+function\\s+${funcName}\\b[^{]*\\{`,
  )
  const match = source.match(pattern)
  if (!match || match.index === undefined) return ''
  let depth = 1
  let i = match.index + match[0].length
  const start = i
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    i++
  }
  return source.slice(start, i)
}

describe('Server Actions 認証チェック', () => {
  describe('deleteTrade', () => {
    const body = extractFunctionBody(actionsSource, 'deleteTrade')

    it('auth.getUser() で認証チェックを行っている', () => {
      expect(body).toContain('getUser')
    })

    it('未認証時にエラーを返す（認証が必要です）', () => {
      expect(body).toContain('認証が必要です')
    })
  })

  describe('updateTrade', () => {
    const body = extractFunctionBody(actionsSource, 'updateTrade')

    it('auth.getUser() で認証チェックを行っている', () => {
      expect(body).toContain('getUser')
    })

    it('未認証時にエラーを返す（認証が必要です）', () => {
      expect(body).toContain('認証が必要です')
    })
  })

  describe('createTrade（既存の認証チェック確認）', () => {
    const body = extractFunctionBody(actionsSource, 'createTrade')

    it('auth.getUser() で認証チェックを行っている', () => {
      expect(body).toContain('getUser')
    })

    it('未認証時にエラーを返す（認証が必要です）', () => {
      expect(body).toContain('認証が必要です')
    })
  })
})
