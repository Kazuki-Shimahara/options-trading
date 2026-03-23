import { describe, it, expect } from 'vitest'
import {
  buildPositionSummary,
  buildIvRankChange,
  buildUpcomingEvents,
  buildDailySummaryMessage,
  type PositionSummary,
  type IvRankChange,
} from '../daily-summary'
import type { Trade } from '@/lib/trade-schema'
import type { CalendarEvent } from '@/lib/events'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: '1',
    user_id: 'user-1',
    created_at: '2026-03-23T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z',
    trade_date: '2026-03-20',
    trade_type: 'call',
    strike_price: 40000,
    expiry_date: '2026-04-10',
    quantity: 1,
    entry_price: 200,
    exit_price: null,
    exit_date: null,
    pnl: null,
    iv_at_entry: 20,
    memo: null,
    status: 'open',
    defeat_tags: null,
    market_env_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: 45,
    entry_iv_hv_ratio: null,
    is_mini: false,
    playbook_id: null,
    playbook_compliance: null,
    ...overrides,
  }
}

describe('buildPositionSummary', () => {
  it('オープンポジションがない場合は空の配列を返す', () => {
    const result = buildPositionSummary([], 40000)
    expect(result).toEqual([])
  })

  it('含み損益を計算する（通常オプション）', () => {
    const trades = [
      makeTrade({ entry_price: 200, quantity: 2, strike_price: 40000, trade_type: 'call' }),
    ]
    // current_price = 300 (仮の現在価格)
    const result = buildPositionSummary(trades, 300)
    expect(result).toHaveLength(1)
    expect(result[0].unrealizedPnl).toBe((300 - 200) * 2 * 1000)
    expect(result[0].tradeType).toBe('call')
    expect(result[0].strikePrice).toBe(40000)
  })

  it('含み損益を計算する（ミニオプション）', () => {
    const trades = [
      makeTrade({ entry_price: 200, quantity: 3, is_mini: true }),
    ]
    const result = buildPositionSummary(trades, 250)
    expect(result).toHaveLength(1)
    expect(result[0].unrealizedPnl).toBe((250 - 200) * 3 * 100)
  })

  it('合計含み損益を正しく集計する', () => {
    const trades = [
      makeTrade({ id: '1', entry_price: 200, quantity: 1 }),
      makeTrade({ id: '2', entry_price: 300, quantity: 1, trade_type: 'put' }),
    ]
    const result = buildPositionSummary(trades, 250)
    // trade1: (250-200)*1*1000 = 50000
    // trade2: (250-300)*1*1000 = -50000
    expect(result).toHaveLength(2)
    const total = result.reduce((sum, p) => sum + p.unrealizedPnl, 0)
    expect(total).toBe(0)
  })
})

describe('buildIvRankChange', () => {
  it('IVランクの変動を計算する', () => {
    const result = buildIvRankChange(
      { call_iv_rank: 55, put_iv_rank: 60 },
      { call_iv_rank: 50, put_iv_rank: 65 }
    )
    expect(result.callIvRank).toBe(55)
    expect(result.putIvRank).toBe(60)
    expect(result.callChange).toBe(5)
    expect(result.putChange).toBe(-5)
  })

  it('前日データがない場合は変動をnullにする', () => {
    const result = buildIvRankChange(
      { call_iv_rank: 55, put_iv_rank: 60 },
      { call_iv_rank: null, put_iv_rank: null }
    )
    expect(result.callIvRank).toBe(55)
    expect(result.callChange).toBeNull()
    expect(result.putChange).toBeNull()
  })

  it('今日のデータがない場合もnullにする', () => {
    const result = buildIvRankChange(
      { call_iv_rank: null, put_iv_rank: null },
      { call_iv_rank: 50, put_iv_rank: 65 }
    )
    expect(result.callIvRank).toBeNull()
    expect(result.callChange).toBeNull()
  })
})

describe('buildUpcomingEvents', () => {
  it('翌日のイベントを返す', () => {
    const events: CalendarEvent[] = [
      {
        id: 'fomc-1',
        date: new Date(2026, 2, 24),
        title: 'FOMC（1日目）',
        category: 'fomc',
        importance: 'high',
      },
      {
        id: 'other-1',
        date: new Date(2026, 2, 25),
        title: '別のイベント',
        category: 'other',
        importance: 'low',
      },
    ]
    const today = new Date(2026, 2, 23)
    const result = buildUpcomingEvents(events, today)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('FOMC（1日目）')
  })

  it('翌日のイベントがない場合は空配列', () => {
    const events: CalendarEvent[] = [
      {
        id: 'fomc-1',
        date: new Date(2026, 2, 25),
        title: 'FOMC',
        category: 'fomc',
        importance: 'high',
      },
    ]
    const today = new Date(2026, 2, 23)
    const result = buildUpcomingEvents(events, today)
    expect(result).toHaveLength(0)
  })
})

describe('buildDailySummaryMessage', () => {
  it('LINE Flex Messageフォーマットを生成する', () => {
    const positions: PositionSummary[] = [
      {
        tradeType: 'call',
        strikePrice: 40000,
        expiryDate: '2026-04-10',
        quantity: 2,
        entryPrice: 200,
        currentPrice: 300,
        unrealizedPnl: 200000,
        isMini: false,
      },
    ]
    const ivChange: IvRankChange = {
      callIvRank: 55,
      putIvRank: 60,
      callChange: 5,
      putChange: -5,
    }
    const upcomingEvents: CalendarEvent[] = [
      {
        id: 'fomc-1',
        date: new Date(2026, 2, 24),
        title: 'FOMC（1日目）',
        category: 'fomc',
        importance: 'high',
      },
    ]

    const message = buildDailySummaryMessage(positions, ivChange, upcomingEvents)

    expect(message.type).toBe('flex')
    expect(message.altText).toContain('今日のサマリー')
    expect(message.contents).toBeDefined()
    expect(message.contents.type).toBe('bubble')
  })

  it('ポジションがない場合もメッセージを生成する', () => {
    const ivChange: IvRankChange = {
      callIvRank: null,
      putIvRank: null,
      callChange: null,
      putChange: null,
    }
    const message = buildDailySummaryMessage([], ivChange, [])
    expect(message.type).toBe('flex')
    expect(message.contents.type).toBe('bubble')
  })
})
