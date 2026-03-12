import { describe, it, expect } from 'vitest'
import {
  DEFEAT_TAGS,
  DEFEAT_TAG_CATEGORIES,
  MARKET_ENV_AXES,
  ALL_MARKET_ENV_TAGS,
  aggregateDefeatTags,
  aggregateMarketEnvTags,
} from '../tags'

describe('DEFEAT_TAGS', () => {
  it('敗因タグが15個定義されている', () => {
    expect(DEFEAT_TAGS).toHaveLength(15)
  })

  it('全てのタグが文字列である', () => {
    for (const tag of DEFEAT_TAGS) {
      expect(typeof tag).toBe('string')
      expect(tag.length).toBeGreaterThan(0)
    }
  })

  it('重複がない', () => {
    const unique = new Set(DEFEAT_TAGS)
    expect(unique.size).toBe(DEFEAT_TAGS.length)
  })

  it('要件定義書に記載の15タグが全て含まれている', () => {
    const expectedTags = [
      'IV高値掴み',
      'トレンド逆張り',
      'イベント前不用意エントリー',
      '方向性判断ミス',
      'エントリー早すぎ',
      'エントリー遅すぎ',
      'SQ接近リスク',
      '損切り遅れ',
      '利確早すぎ',
      '利確遅すぎ',
      'ポジションサイズ過大',
      'デルタ偏り',
      '証拠金不足',
      '想定外イベント',
      '流動性不足',
    ]
    for (const tag of expectedTags) {
      expect(DEFEAT_TAGS).toContain(tag)
    }
  })
})

describe('DEFEAT_TAG_CATEGORIES', () => {
  it('5つのカテゴリが定義されている', () => {
    expect(Object.keys(DEFEAT_TAG_CATEGORIES)).toHaveLength(5)
  })

  it('全カテゴリのタグを合計すると15個になる', () => {
    const allTags = Object.values(DEFEAT_TAG_CATEGORIES).flat()
    expect(allTags).toHaveLength(15)
  })

  it('カテゴリ内のタグが全てDEFEAT_TAGSに含まれている', () => {
    for (const tags of Object.values(DEFEAT_TAG_CATEGORIES)) {
      for (const tag of tags) {
        expect(DEFEAT_TAGS).toContain(tag)
      }
    }
  })
})

describe('MARKET_ENV_AXES', () => {
  it('4軸が定義されている', () => {
    expect(Object.keys(MARKET_ENV_AXES)).toHaveLength(4)
    expect(MARKET_ENV_AXES).toHaveProperty('risk')
    expect(MARKET_ENV_AXES).toHaveProperty('trend')
    expect(MARKET_ENV_AXES).toHaveProperty('volatility')
    expect(MARKET_ENV_AXES).toHaveProperty('event')
  })

  it('リスク軸に2つのタグがある', () => {
    expect(MARKET_ENV_AXES.risk.tags).toHaveLength(2)
    expect(MARKET_ENV_AXES.risk.tags).toContain('リスクオン')
    expect(MARKET_ENV_AXES.risk.tags).toContain('リスクオフ')
  })

  it('トレンド軸に3つのタグがある', () => {
    expect(MARKET_ENV_AXES.trend.tags).toHaveLength(3)
    expect(MARKET_ENV_AXES.trend.tags).toContain('上昇トレンド')
    expect(MARKET_ENV_AXES.trend.tags).toContain('下降トレンド')
    expect(MARKET_ENV_AXES.trend.tags).toContain('レンジ相場')
  })

  it('ボラティリティ軸に3つのタグがある', () => {
    expect(MARKET_ENV_AXES.volatility.tags).toHaveLength(3)
    expect(MARKET_ENV_AXES.volatility.tags).toContain('高ボラ(VI25超)')
    expect(MARKET_ENV_AXES.volatility.tags).toContain('通常ボラ(VI18-25)')
    expect(MARKET_ENV_AXES.volatility.tags).toContain('低ボラ(VI18未満)')
  })

  it('イベント軸に5つのタグがある', () => {
    expect(MARKET_ENV_AXES.event.tags).toHaveLength(5)
    expect(MARKET_ENV_AXES.event.tags).toContain('イベント前(3営業日以内)')
    expect(MARKET_ENV_AXES.event.tags).toContain('イベント後')
    expect(MARKET_ENV_AXES.event.tags).toContain('SQ週')
    expect(MARKET_ENV_AXES.event.tags).toContain('決算シーズン')
    expect(MARKET_ENV_AXES.event.tags).toContain('通常')
  })

  it('ALL_MARKET_ENV_TAGSが全軸のタグを含む（合計13個）', () => {
    expect(ALL_MARKET_ENV_TAGS).toHaveLength(13)
    const unique = new Set(ALL_MARKET_ENV_TAGS)
    expect(unique.size).toBe(ALL_MARKET_ENV_TAGS.length)
  })
})

describe('aggregateDefeatTags', () => {
  it('敗因タグの出現回数と損失額を集計する', () => {
    const trades = [
      { defeat_tags: ['IV高値掴み', '損切り遅れ'], pnl: -50000 },
      { defeat_tags: ['IV高値掴み'], pnl: -30000 },
      { defeat_tags: ['トレンド逆張り'], pnl: -10000 },
    ]

    const result = aggregateDefeatTags(trades)
    const ivTag = result.find((r) => r.tag === 'IV高値掴み')!
    expect(ivTag.count).toBe(2)
    expect(ivTag.totalLoss).toBe(-80000)

    const lossTag = result.find((r) => r.tag === '損切り遅れ')!
    expect(lossTag.count).toBe(1)
    expect(lossTag.totalLoss).toBe(-50000)
  })

  it('defeat_tagsがnullの取引はスキップする', () => {
    const trades = [
      { defeat_tags: null, pnl: -50000 },
      { defeat_tags: ['IV高値掴み'], pnl: -30000 },
    ]

    const result = aggregateDefeatTags(trades)
    const ivTag = result.find((r) => r.tag === 'IV高値掴み')!
    expect(ivTag.count).toBe(1)
  })

  it('出現回数の多い順にソートされる', () => {
    const trades = [
      { defeat_tags: ['損切り遅れ'], pnl: -10000 },
      { defeat_tags: ['損切り遅れ'], pnl: -20000 },
      { defeat_tags: ['IV高値掴み'], pnl: -30000 },
    ]

    const result = aggregateDefeatTags(trades)
    expect(result[0].tag).toBe('損切り遅れ')
    expect(result[0].count).toBe(2)
  })

  it('利益トレードの場合はtotalLossに加算しない', () => {
    const trades = [{ defeat_tags: ['IV高値掴み'], pnl: 50000 }]

    const result = aggregateDefeatTags(trades)
    const ivTag = result.find((r) => r.tag === 'IV高値掴み')!
    expect(ivTag.count).toBe(1)
    expect(ivTag.totalLoss).toBe(0)
  })

  it('空の取引リストでも全タグが返される', () => {
    const result = aggregateDefeatTags([])
    expect(result).toHaveLength(15)
    for (const entry of result) {
      expect(entry.count).toBe(0)
      expect(entry.totalLoss).toBe(0)
    }
  })
})

describe('aggregateMarketEnvTags', () => {
  it('市場環境タグ別の勝率を集計する', () => {
    const trades = [
      { market_env_tags: ['リスクオン', '上昇トレンド'], pnl: 50000 },
      { market_env_tags: ['リスクオン', '上昇トレンド'], pnl: 30000 },
      { market_env_tags: ['リスクオン', '下降トレンド'], pnl: -20000 },
    ]

    const result = aggregateMarketEnvTags(trades)

    const riskOn = result.find((r) => r.tag === 'リスクオン')!
    expect(riskOn.wins).toBe(2)
    expect(riskOn.losses).toBe(1)
    expect(riskOn.total).toBe(3)
    expect(riskOn.winRate).toBeCloseTo(66.67, 1)

    const upTrend = result.find((r) => r.tag === '上昇トレンド')!
    expect(upTrend.wins).toBe(2)
    expect(upTrend.losses).toBe(0)
    expect(upTrend.winRate).toBe(100)
  })

  it('market_env_tagsがnullの取引はスキップする', () => {
    const trades = [
      { market_env_tags: null, pnl: 50000 },
      { market_env_tags: ['リスクオン'], pnl: 30000 },
    ]

    const result = aggregateMarketEnvTags(trades)
    const riskOn = result.find((r) => r.tag === 'リスクオン')!
    expect(riskOn.total).toBe(1)
  })

  it('pnlがnullの取引はスキップする', () => {
    const trades = [{ market_env_tags: ['リスクオン'], pnl: null }]

    const result = aggregateMarketEnvTags(trades)
    const riskOn = result.find((r) => r.tag === 'リスクオン')!
    expect(riskOn.total).toBe(0)
  })

  it('取引がない場合は全タグが勝率0%で返される', () => {
    const result = aggregateMarketEnvTags([])
    expect(result).toHaveLength(13)
    for (const entry of result) {
      expect(entry.winRate).toBe(0)
      expect(entry.total).toBe(0)
    }
  })
})
