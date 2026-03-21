import { describe, it, expect } from 'vitest'
import {
  detectStreaks,
  detectRevengeTrades,
  calculateMentalScore,
  analyzePositionSizeChanges,
} from '../streak-analysis'
import type { Trade } from '@/types/database'

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: '1',
    user_id: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    trade_date: '2025-01-01',
    trade_type: 'call',
    strike_price: 30000,
    expiry_date: '2025-02-01',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: '2025-01-15',
    pnl: 50000,
    iv_at_entry: null,
    memo: null,
    status: 'closed',
    defeat_tags: null,
    market_env_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: null,
    entry_iv_hv_ratio: null,
    is_mini: false,
    playbook_id: null,
    playbook_compliance: null,
    ...overrides,
  }
}

describe('detectStreaks', () => {
  it('取引0件で空配列を返す', () => {
    expect(detectStreaks([])).toEqual([])
  })

  it('全て勝ちの場合、1つの連勝ストリークを返す', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 20000 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: 5000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('win')
    expect(result[0].count).toBe(3)
  })

  it('全て負けの場合、1つの連敗ストリークを返す', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: -10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: -5000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('loss')
    expect(result[0].count).toBe(2)
  })

  it('勝ち→負け→勝ちで3つのストリークを返す', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 20000 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: -5000 }),
      makeTrade({ id: '4', trade_date: '2025-01-04', pnl: 15000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(expect.objectContaining({ type: 'win', count: 2 }))
    expect(result[1]).toEqual(expect.objectContaining({ type: 'loss', count: 1 }))
    expect(result[2]).toEqual(expect.objectContaining({ type: 'win', count: 1 }))
  })

  it('pnlがnullの取引はスキップされる', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: null }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: 20000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(2)
  })

  it('trade_date順にソートして処理する', () => {
    const trades = [
      makeTrade({ id: '2', trade_date: '2025-01-05', pnl: -10000 }),
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('win')
    expect(result[1].type).toBe('loss')
  })

  it('pnl=0は勝ちとして扱う', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 0 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 10000 }),
    ]
    const result = detectStreaks(trades)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('win')
    expect(result[0].count).toBe(2)
  })
})

describe('detectRevengeTrades', () => {
  it('取引0件で空配列を返す', () => {
    expect(detectRevengeTrades([])).toEqual([])
  })

  it('損失後24時間以内に倍以上のポジションを取った場合リベンジトレードと判定', () => {
    const trades = [
      makeTrade({
        id: '1',
        trade_date: '2025-01-01T10:00:00Z',
        pnl: -50000,
        quantity: 1,
        exit_date: '2025-01-01T10:00:00Z',
      }),
      makeTrade({
        id: '2',
        trade_date: '2025-01-01T14:00:00Z',
        quantity: 3,
        pnl: null,
      }),
    ]
    const result = detectRevengeTrades(trades)
    expect(result).toHaveLength(1)
    expect(result[0].tradeId).toBe('2')
    expect(result[0].reason).toContain('短時間')
  })

  it('損失後24時間以上経過した場合はリベンジトレードと判定しない', () => {
    const trades = [
      makeTrade({
        id: '1',
        trade_date: '2025-01-01T10:00:00Z',
        pnl: -50000,
        quantity: 1,
        exit_date: '2025-01-01T10:00:00Z',
      }),
      makeTrade({
        id: '2',
        trade_date: '2025-01-03T10:00:00Z',
        quantity: 3,
        pnl: null,
      }),
    ]
    const result = detectRevengeTrades(trades)
    expect(result).toHaveLength(0)
  })

  it('勝ちトレード後の取引はリベンジトレードにならない', () => {
    const trades = [
      makeTrade({
        id: '1',
        trade_date: '2025-01-01T10:00:00Z',
        pnl: 50000,
        quantity: 1,
        exit_date: '2025-01-01T10:00:00Z',
      }),
      makeTrade({
        id: '2',
        trade_date: '2025-01-01T14:00:00Z',
        quantity: 5,
        pnl: null,
      }),
    ]
    const result = detectRevengeTrades(trades)
    expect(result).toHaveLength(0)
  })

  it('損失後に同サイズのポジションはリベンジトレードにならない', () => {
    const trades = [
      makeTrade({
        id: '1',
        trade_date: '2025-01-01T10:00:00Z',
        pnl: -50000,
        quantity: 2,
        exit_date: '2025-01-01T10:00:00Z',
      }),
      makeTrade({
        id: '2',
        trade_date: '2025-01-01T14:00:00Z',
        quantity: 2,
        pnl: null,
      }),
    ]
    const result = detectRevengeTrades(trades)
    expect(result).toHaveLength(0)
  })
})

describe('calculateMentalScore', () => {
  it('取引0件で空配列を返す', () => {
    expect(calculateMentalScore([])).toEqual([])
  })

  it('連勝するとスコアが上がる', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 20000 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: 30000 }),
    ]
    const result = calculateMentalScore(trades)
    expect(result).toHaveLength(3)
    expect(result[2].score).toBeGreaterThan(result[0].score)
  })

  it('連敗するとスコアが下がる', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: -10000 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: -20000 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: -30000 }),
    ]
    const result = calculateMentalScore(trades)
    expect(result).toHaveLength(3)
    expect(result[2].score).toBeLessThan(result[0].score)
  })

  it('スコアは0-100の範囲内に収まる', () => {
    const trades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({ id: String(i), trade_date: `2025-01-${String(i + 1).padStart(2, '0')}`, pnl: -100000 })
    )
    const result = calculateMentalScore(trades)
    for (const entry of result) {
      expect(entry.score).toBeGreaterThanOrEqual(0)
      expect(entry.score).toBeLessThanOrEqual(100)
    }
  })

  it('各エントリにtradeDate情報が含まれる', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-05', pnl: 10000 }),
    ]
    const result = calculateMentalScore(trades)
    expect(result[0].date).toBe('2025-01-05')
  })
})

describe('analyzePositionSizeChanges', () => {
  it('取引0件で空の結果を返す', () => {
    const result = analyzePositionSizeChanges([])
    expect(result.duringWinStreak).toBeNull()
    expect(result.duringLossStreak).toBeNull()
  })

  it('連勝中のポジションサイズ平均を計算する', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000, quantity: 1 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 20000, quantity: 2 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: 30000, quantity: 3 }),
    ]
    const result = analyzePositionSizeChanges(trades)
    expect(result.duringWinStreak).toBe(2) // (1+2+3)/3
  })

  it('連敗中のポジションサイズ平均を計算する', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: -10000, quantity: 1 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: -20000, quantity: 4 }),
    ]
    const result = analyzePositionSizeChanges(trades)
    expect(result.duringLossStreak).toBe(2.5) // (1+4)/2
  })

  it('連勝と連敗が両方ある場合にそれぞれの平均を返す', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000, quantity: 1 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: 20000, quantity: 2 }),
      makeTrade({ id: '3', trade_date: '2025-01-03', pnl: -5000, quantity: 3 }),
      makeTrade({ id: '4', trade_date: '2025-01-04', pnl: -8000, quantity: 5 }),
    ]
    const result = analyzePositionSizeChanges(trades)
    expect(result.duringWinStreak).toBe(1.5) // (1+2)/2
    expect(result.duringLossStreak).toBe(4) // (3+5)/2
  })

  it('baselineAvgを全取引の平均として返す', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-01', pnl: 10000, quantity: 2 }),
      makeTrade({ id: '2', trade_date: '2025-01-02', pnl: -5000, quantity: 4 }),
    ]
    const result = analyzePositionSizeChanges(trades)
    expect(result.baselineAvg).toBe(3) // (2+4)/2
  })
})
