// 敗因タグ定義（15個）
export const DEFEAT_TAGS = [
  // エントリー判断ミス
  'IV高値掴み',
  'トレンド逆張り',
  'イベント前不用意エントリー',
  '方向性判断ミス',
  // タイミングミス
  'エントリー早すぎ',
  'エントリー遅すぎ',
  'SQ接近リスク',
  // エグジット判断ミス
  '損切り遅れ',
  '利確早すぎ',
  '利確遅すぎ',
  // リスク管理ミス
  'ポジションサイズ過大',
  'デルタ偏り',
  '証拠金不足',
  // 外部要因
  '想定外イベント',
  '流動性不足',
] as const

export type DefeatTag = (typeof DEFEAT_TAGS)[number]

// 敗因タグのカテゴリ分類
export const DEFEAT_TAG_CATEGORIES: Record<string, readonly DefeatTag[]> = {
  'エントリー判断ミス': ['IV高値掴み', 'トレンド逆張り', 'イベント前不用意エントリー', '方向性判断ミス'],
  'タイミングミス': ['エントリー早すぎ', 'エントリー遅すぎ', 'SQ接近リスク'],
  'エグジット判断ミス': ['損切り遅れ', '利確早すぎ', '利確遅すぎ'],
  'リスク管理ミス': ['ポジションサイズ過大', 'デルタ偏り', '証拠金不足'],
  '外部要因': ['想定外イベント', '流動性不足'],
} as const

// 市場環境タグ定義（4軸）
export const MARKET_ENV_AXES = {
  risk: {
    label: 'リスク',
    tags: ['リスクオン', 'リスクオフ'] as const,
  },
  trend: {
    label: 'トレンド',
    tags: ['上昇トレンド', '下降トレンド', 'レンジ相場'] as const,
  },
  volatility: {
    label: 'ボラティリティ',
    tags: ['高ボラ(VI25超)', '通常ボラ(VI18-25)', '低ボラ(VI18未満)'] as const,
  },
  event: {
    label: 'イベント',
    tags: ['イベント前(3営業日以内)', 'イベント後', 'SQ週', '決算シーズン', '通常'] as const,
  },
} as const

export type MarketEnvAxis = keyof typeof MARKET_ENV_AXES

export const ALL_MARKET_ENV_TAGS = Object.values(MARKET_ENV_AXES).flatMap((axis) => [...axis.tags])

export type MarketEnvTag = (typeof ALL_MARKET_ENV_TAGS)[number]

// 集計ユーティリティ
export interface TagAggregation {
  tag: string
  count: number
  totalLoss: number
}

export function aggregateDefeatTags(
  trades: Array<{ defeat_tags: string[] | null; pnl: number | null }>
): TagAggregation[] {
  const map = new Map<string, { count: number; totalLoss: number }>()

  for (const tag of DEFEAT_TAGS) {
    map.set(tag, { count: 0, totalLoss: 0 })
  }

  for (const trade of trades) {
    if (!trade.defeat_tags) continue
    for (const tag of trade.defeat_tags) {
      const entry = map.get(tag)
      if (entry) {
        entry.count += 1
        entry.totalLoss += trade.pnl != null && trade.pnl < 0 ? trade.pnl : 0
      }
    }
  }

  return Array.from(map.entries())
    .map(([tag, data]) => ({ tag, ...data }))
    .sort((a, b) => b.count - a.count)
}

export interface MarketEnvWinRate {
  tag: string
  wins: number
  losses: number
  total: number
  winRate: number
}

export function aggregateMarketEnvTags(
  trades: Array<{ market_env_tags: string[] | null; pnl: number | null }>
): MarketEnvWinRate[] {
  const map = new Map<string, { wins: number; losses: number }>()

  for (const tag of ALL_MARKET_ENV_TAGS) {
    map.set(tag, { wins: 0, losses: 0 })
  }

  for (const trade of trades) {
    if (!trade.market_env_tags || trade.pnl == null) continue
    for (const tag of trade.market_env_tags) {
      const entry = map.get(tag)
      if (entry) {
        if (trade.pnl >= 0) {
          entry.wins += 1
        } else {
          entry.losses += 1
        }
      }
    }
  }

  return Array.from(map.entries()).map(([tag, data]) => {
    const total = data.wins + data.losses
    return {
      tag,
      ...data,
      total,
      winRate: total > 0 ? (data.wins / total) * 100 : 0,
    }
  })
}
