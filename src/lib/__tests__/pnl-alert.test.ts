import { describe, it, expect } from 'vitest'
import {
  calculateUnrealizedPnl,
  isThresholdExceeded,
  isInCooldown,
  checkAlerts,
  formatAlertMessage,
} from '../pnl-alert'
import type { Trade } from '@/lib/trade-schema'
import type { PnlAlertSetting, PnlAlertNotification } from '@/types/database'

const baseTrade: Trade = {
  id: 'trade-1',
  user_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  trade_date: '2026-01-01',
  trade_type: 'put',
  strike_price: 38000,
  expiry_date: '2026-02-14',
  quantity: 2,
  entry_price: 300,
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
  entry_iv_rank: null,
  entry_iv_hv_ratio: null,
  is_mini: false,
  playbook_id: null,
  playbook_compliance: null,
  confidence_level: null,
  emotion: null,
}

const baseSetting: PnlAlertSetting = {
  id: 'setting-1',
  trade_id: 'trade-1',
  threshold_amount: 100000,
  direction: 'loss',
  enabled: true,
  cooldown_minutes: 60,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('calculateUnrealizedPnl', () => {
  it('通常オプションの含み損益を計算する（乗数1000）', () => {
    // (200 - 300) * 2 * 1000 = -200,000
    const pnl = calculateUnrealizedPnl(baseTrade, 200)
    expect(pnl).toBe(-200000)
  })

  it('通常オプションの含み益を計算する', () => {
    // (500 - 300) * 2 * 1000 = 400,000
    const pnl = calculateUnrealizedPnl(baseTrade, 500)
    expect(pnl).toBe(400000)
  })

  it('ミニオプションの含み損益を計算する（乗数100）', () => {
    const miniTrade = { ...baseTrade, is_mini: true }
    // (200 - 300) * 2 * 100 = -20,000
    const pnl = calculateUnrealizedPnl(miniTrade, 200)
    expect(pnl).toBe(-20000)
  })

  it('現在価格がエントリー価格と同じなら0', () => {
    const pnl = calculateUnrealizedPnl(baseTrade, 300)
    expect(pnl).toBe(0)
  })
})

describe('isThresholdExceeded', () => {
  it('loss方向: 含み損が閾値以下で超過判定', () => {
    expect(isThresholdExceeded(-150000, { ...baseSetting, direction: 'loss' })).toBe(true)
  })

  it('loss方向: 含み損が閾値未達で非超過', () => {
    expect(isThresholdExceeded(-50000, { ...baseSetting, direction: 'loss' })).toBe(false)
  })

  it('loss方向: 含み益は非超過', () => {
    expect(isThresholdExceeded(200000, { ...baseSetting, direction: 'loss' })).toBe(false)
  })

  it('profit方向: 含み益が閾値以上で超過判定', () => {
    expect(isThresholdExceeded(150000, { ...baseSetting, direction: 'profit' })).toBe(true)
  })

  it('profit方向: 含み益が閾値未達で非超過', () => {
    expect(isThresholdExceeded(50000, { ...baseSetting, direction: 'profit' })).toBe(false)
  })

  it('both方向: 含み損の絶対値が閾値以上で超過判定', () => {
    expect(isThresholdExceeded(-150000, { ...baseSetting, direction: 'both' })).toBe(true)
  })

  it('both方向: 含み益の絶対値が閾値以上で超過判定', () => {
    expect(isThresholdExceeded(150000, { ...baseSetting, direction: 'both' })).toBe(true)
  })

  it('both方向: 絶対値が閾値未達で非超過', () => {
    expect(isThresholdExceeded(50000, { ...baseSetting, direction: 'both' })).toBe(false)
  })

  it('閾値ちょうどの場合は超過判定', () => {
    expect(isThresholdExceeded(-100000, { ...baseSetting, direction: 'loss' })).toBe(true)
    expect(isThresholdExceeded(100000, { ...baseSetting, direction: 'profit' })).toBe(true)
  })
})

describe('isInCooldown', () => {
  it('通知履歴がなければクールダウンではない', () => {
    expect(isInCooldown(null, 60)).toBe(false)
  })

  it('クールダウン期間内であればtrue', () => {
    const now = new Date('2026-01-01T10:30:00Z')
    const notification: PnlAlertNotification = {
      id: 'notif-1',
      alert_setting_id: 'setting-1',
      trade_id: 'trade-1',
      triggered_pnl: -150000,
      threshold_amount: 100000,
      sent_at: '2026-01-01T10:00:00Z',
    }
    // 30分前 < 60分のクールダウン → true
    expect(isInCooldown(notification, 60, now)).toBe(true)
  })

  it('クールダウン期間を過ぎていればfalse', () => {
    const now = new Date('2026-01-01T11:30:00Z')
    const notification: PnlAlertNotification = {
      id: 'notif-1',
      alert_setting_id: 'setting-1',
      trade_id: 'trade-1',
      triggered_pnl: -150000,
      threshold_amount: 100000,
      sent_at: '2026-01-01T10:00:00Z',
    }
    // 90分前 >= 60分のクールダウン → false
    expect(isInCooldown(notification, 60, now)).toBe(false)
  })
})

describe('checkAlerts', () => {
  const now = new Date('2026-01-01T12:00:00Z')

  it('閾値超過かつクールダウン外であれば通知対象', () => {
    const prices = new Map([['trade-1', 200]]) // PnL = -200,000
    const results = checkAlerts([baseTrade], [baseSetting], prices, new Map(), now)

    expect(results).toHaveLength(1)
    expect(results[0].shouldNotify).toBe(true)
    expect(results[0].reason).toBe('閾値超過')
  })

  it('閾値未達であれば通知しない', () => {
    const prices = new Map([['trade-1', 280]]) // PnL = -40,000 (< 100,000)
    const results = checkAlerts([baseTrade], [baseSetting], prices, new Map(), now)

    expect(results).toHaveLength(1)
    expect(results[0].shouldNotify).toBe(false)
    expect(results[0].reason).toBe('閾値未達')
  })

  it('クールダウン期間中は通知しない', () => {
    const prices = new Map([['trade-1', 200]]) // PnL = -200,000
    const recentNotification: PnlAlertNotification = {
      id: 'notif-1',
      alert_setting_id: 'setting-1',
      trade_id: 'trade-1',
      triggered_pnl: -200000,
      threshold_amount: 100000,
      sent_at: '2026-01-01T11:30:00Z', // 30分前
    }
    const notifications = new Map([['setting-1', recentNotification]])
    const results = checkAlerts([baseTrade], [baseSetting], prices, notifications, now)

    expect(results).toHaveLength(1)
    expect(results[0].shouldNotify).toBe(false)
    expect(results[0].reason).toBe('クールダウン期間中')
  })

  it('無効なアラート設定はスキップする', () => {
    const disabledSetting = { ...baseSetting, enabled: false }
    const prices = new Map([['trade-1', 200]])
    const results = checkAlerts([baseTrade], [disabledSetting], prices, new Map(), now)

    expect(results).toHaveLength(0)
  })

  it('クローズ済みトレードはスキップする', () => {
    const closedTrade = { ...baseTrade, status: 'closed' as const }
    const prices = new Map([['trade-1', 200]])
    const results = checkAlerts([closedTrade], [baseSetting], prices, new Map(), now)

    expect(results).toHaveLength(0)
  })

  it('現在価格がないトレードはスキップする', () => {
    const results = checkAlerts([baseTrade], [baseSetting], new Map(), new Map(), now)

    expect(results).toHaveLength(0)
  })
})

describe('formatAlertMessage', () => {
  it('含み損アラートのメッセージを生成する', () => {
    const { title, body } = formatAlertMessage(baseTrade, -200000, 100000)

    expect(title).toBe('含み損アラート')
    expect(body).toContain('プット')
    expect(body).toContain('38000')
    expect(body).toContain('2枚')
    expect(body).toContain('-200,000円')
    expect(body).toContain('100,000円')
  })

  it('含み益アラートのメッセージを生成する', () => {
    const callTrade = { ...baseTrade, trade_type: 'call' as const }
    const { title, body } = formatAlertMessage(callTrade, 300000, 100000)

    expect(title).toBe('含み益アラート')
    expect(body).toContain('コール')
    expect(body).toContain('+300,000円')
  })
})
