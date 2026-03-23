import { describe, it, expect } from 'vitest'
import { calculatePnl } from '../trade'
import { MULTIPLIER_STANDARD, MULTIPLIER_MINI } from '../constants'

describe('ミニオプション対応', () => {
  describe('calculatePnl - 乗数切り替え', () => {
    it('通常オプション（is_mini=false）は乗数1000で計算', () => {
      const multiplier = MULTIPLIER_STANDARD
      // (200 - 150) * 2 * 1000 = 100,000
      expect(calculatePnl(200, 150, 2, multiplier)).toBe(100000)
    })

    it('ミニオプション（is_mini=true）は乗数100で計算', () => {
      const multiplier = MULTIPLIER_MINI
      // (200 - 150) * 2 * 100 = 10,000
      expect(calculatePnl(200, 150, 2, multiplier)).toBe(10000)
    })

    it('ミニオプションの損失計算', () => {
      const multiplier = MULTIPLIER_MINI
      // (100 - 150) * 1 * 100 = -5,000
      expect(calculatePnl(100, 150, 1, multiplier)).toBe(-5000)
    })
  })

  describe('getMultiplier ヘルパー', () => {
    it('is_mini=false で MULTIPLIER_STANDARD を返す', async () => {
      const { getMultiplier } = await import('../trade')
      expect(getMultiplier(false)).toBe(MULTIPLIER_STANDARD)
    })

    it('is_mini=true で MULTIPLIER_MINI を返す', async () => {
      const { getMultiplier } = await import('../trade')
      expect(getMultiplier(true)).toBe(MULTIPLIER_MINI)
    })
  })

  describe('trade-schema: is_mini フィールド', () => {
    it('createTradeSchema に is_mini が含まれる', async () => {
      const { createTradeSchema } = await import('../trade-schema')
      const validInput = {
        trade_date: '2026-01-01',
        trade_type: 'call',
        strike_price: 39000,
        expiry_date: '2026-02-14',
        quantity: 1,
        entry_price: 150,
        exit_price: null,
        exit_date: null,
        iv_at_entry: null,
        memo: null,
        entry_delta: null,
        entry_gamma: null,
        entry_theta: null,
        entry_vega: null,
        defeat_tags: null,
        market_env_tags: null,
        is_mini: true,
      }
      const result = createTradeSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_mini).toBe(true)
      }
    })

    it('createTradeSchema の is_mini デフォルト値は false', async () => {
      const { createTradeSchema } = await import('../trade-schema')
      const validInput = {
        trade_date: '2026-01-01',
        trade_type: 'call',
        strike_price: 39000,
        expiry_date: '2026-02-14',
        quantity: 1,
        entry_price: 150,
        exit_price: null,
        exit_date: null,
        iv_at_entry: null,
        memo: null,
        entry_delta: null,
        entry_gamma: null,
        entry_theta: null,
        entry_vega: null,
        defeat_tags: null,
        market_env_tags: null,
      }
      const result = createTradeSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_mini).toBe(false)
      }
    })

    it('tradeSchema に is_mini が含まれる', async () => {
      const { tradeSchema } = await import('../trade-schema')
      const row = {
        id: '123',
        user_id: 'user1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        trade_date: '2026-01-01',
        trade_type: 'call',
        strike_price: 39000,
        expiry_date: '2026-02-14',
        quantity: 1,
        entry_price: 150,
        exit_price: null,
        exit_date: null,
        pnl: null,
        iv_at_entry: null,
        memo: null,
        status: 'open',
        defeat_tags: null,
        market_env_tags: null,
        entry_delta: null,
        entry_gamma: null,
        entry_theta: null,
        entry_vega: null,
        entry_iv_rank: null,
        entry_iv_hv_ratio: null,
        is_mini: true,
        playbook_id: null,
        playbook_compliance: null,
        confidence_level: null,
        emotion: null,
      }
      const result = tradeSchema.safeParse(row)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_mini).toBe(true)
      }
    })
  })
})
