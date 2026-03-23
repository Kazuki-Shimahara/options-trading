/**
 * 日次サマリー生成ロジック
 * ポジション含み損益、IVランク変動、翌日注目イベントをまとめる
 */

import type { Trade } from '@/lib/trade-schema'
import type { CalendarEvent } from '@/lib/events'
import type { IvRankData } from '@/lib/supabase'
import {
  MULTIPLIER_STANDARD,
  MULTIPLIER_MINI,
} from '@/lib/constants'

export interface PositionSummary {
  tradeType: 'call' | 'put'
  strikePrice: number
  expiryDate: string
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  isMini: boolean
}

export interface IvRankChange {
  callIvRank: number | null
  putIvRank: number | null
  callChange: number | null
  putChange: number | null
}

/**
 * オープンポジションの含み損益サマリーを構築
 * currentPrice は簡易計算として全ポジション共通の参考価格を使用
 */
export function buildPositionSummary(
  trades: Trade[],
  currentPrice: number
): PositionSummary[] {
  return trades.map((trade) => {
    const multiplier = trade.is_mini ? MULTIPLIER_MINI : MULTIPLIER_STANDARD
    const unrealizedPnl =
      (currentPrice - trade.entry_price) * trade.quantity * multiplier

    return {
      tradeType: trade.trade_type,
      strikePrice: trade.strike_price,
      expiryDate: trade.expiry_date,
      quantity: trade.quantity,
      entryPrice: trade.entry_price,
      currentPrice,
      unrealizedPnl,
      isMini: trade.is_mini,
    }
  })
}

/**
 * IVランクの前日比変動を計算
 */
export function buildIvRankChange(
  today: IvRankData,
  yesterday: IvRankData
): IvRankChange {
  const callChange =
    today.call_iv_rank != null && yesterday.call_iv_rank != null
      ? today.call_iv_rank - yesterday.call_iv_rank
      : null
  const putChange =
    today.put_iv_rank != null && yesterday.put_iv_rank != null
      ? today.put_iv_rank - yesterday.put_iv_rank
      : null

  return {
    callIvRank: today.call_iv_rank,
    putIvRank: today.put_iv_rank,
    callChange,
    putChange,
  }
}

/**
 * 翌日の注目イベントを抽出
 */
export function buildUpcomingEvents(
  events: CalendarEvent[],
  today: Date
): CalendarEvent[] {
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return events.filter(
    (e) =>
      e.date.getFullYear() === tomorrow.getFullYear() &&
      e.date.getMonth() === tomorrow.getMonth() &&
      e.date.getDate() === tomorrow.getDate()
  )
}

/** 金額フォーマット */
function formatCurrency(value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('ja-JP')}円`
}

/** IVランク変動フォーマット */
function formatChange(value: number | null): string {
  if (value == null) return '-'
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}`
}

/** IVランク変動の色 */
function changeColor(value: number | null): string {
  if (value == null) return '#999999'
  if (value > 0) return '#FF4444'
  if (value < 0) return '#4488FF'
  return '#999999'
}

/**
 * LINE Flex Message形式のサマリーメッセージを構築
 */
export function buildDailySummaryMessage(
  positions: PositionSummary[],
  ivChange: IvRankChange,
  upcomingEvents: CalendarEvent[]
): FlexMessage {
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
  const totalColor = totalPnl >= 0 ? '#00AA00' : '#FF4444'

  // ポジションセクション
  const positionContents: FlexComponent[] = [
    {
      type: 'text',
      text: 'ポジション含み損益',
      weight: 'bold',
      size: 'md',
      color: '#333333',
    },
  ]

  if (positions.length === 0) {
    positionContents.push({
      type: 'text',
      text: 'オープンポジションなし',
      size: 'sm',
      color: '#999999',
      margin: 'sm',
    })
  } else {
    for (const pos of positions) {
      const label = `${pos.tradeType.toUpperCase()} ${pos.strikePrice}${pos.isMini ? ' (mini)' : ''}`
      positionContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: label, size: 'sm', color: '#555555', flex: 3 },
          {
            type: 'text',
            text: formatCurrency(pos.unrealizedPnl),
            size: 'sm',
            color: pos.unrealizedPnl >= 0 ? '#00AA00' : '#FF4444',
            align: 'end',
            flex: 2,
          },
        ],
      })
    }

    positionContents.push({
      type: 'separator',
      margin: 'md',
    })
    positionContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: '合計', weight: 'bold', size: 'md', color: '#333333', flex: 3 },
        {
          type: 'text',
          text: formatCurrency(totalPnl),
          weight: 'bold',
          size: 'md',
          color: totalColor,
          align: 'end',
          flex: 2,
        },
      ],
    })
  }

  // IVランクセクション
  const ivContents: FlexComponent[] = [
    {
      type: 'text',
      text: 'IVランク（前日比）',
      weight: 'bold',
      size: 'md',
      color: '#333333',
      margin: 'lg',
    },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: 'Call IV Rank', size: 'sm', color: '#555555', flex: 3 },
        {
          type: 'text',
          text: ivChange.callIvRank != null
            ? `${ivChange.callIvRank.toFixed(1)} (${formatChange(ivChange.callChange)})`
            : '-',
          size: 'sm',
          color: changeColor(ivChange.callChange),
          align: 'end',
          flex: 2,
        },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: 'Put IV Rank', size: 'sm', color: '#555555', flex: 3 },
        {
          type: 'text',
          text: ivChange.putIvRank != null
            ? `${ivChange.putIvRank.toFixed(1)} (${formatChange(ivChange.putChange)})`
            : '-',
          size: 'sm',
          color: changeColor(ivChange.putChange),
          align: 'end',
          flex: 2,
        },
      ],
    },
  ]

  // イベントセクション
  const eventContents: FlexComponent[] = []
  if (upcomingEvents.length > 0) {
    eventContents.push({
      type: 'text',
      text: '明日の注目イベント',
      weight: 'bold',
      size: 'md',
      color: '#333333',
      margin: 'lg',
    })
    for (const event of upcomingEvents) {
      const icon = event.importance === 'high' ? '🔴' : event.importance === 'medium' ? '🟡' : '⚪'
      eventContents.push({
        type: 'text',
        text: `${icon} ${event.title}`,
        size: 'sm',
        color: '#555555',
        margin: 'sm',
      })
    }
  }

  const today = new Date()
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#1a1a2e',
      paddingAll: 'lg',
      contents: [
        {
          type: 'text',
          text: `📊 今日のサマリー`,
          color: '#FFFFFF',
          weight: 'bold',
          size: 'lg',
        },
        {
          type: 'text',
          text: dateStr,
          color: '#AAAAAA',
          size: 'xs',
          margin: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        ...positionContents,
        ...ivContents,
        ...eventContents,
      ],
    },
  }

  return {
    type: 'flex',
    altText: `今日のサマリー (${dateStr})`,
    contents: bubble,
  }
}

// LINE Flex Message types (simplified)
export interface FlexMessage {
  type: 'flex'
  altText: string
  contents: FlexBubble
}

export interface FlexBubble {
  type: 'bubble'
  header?: FlexBox
  body: FlexBox
}

export interface FlexBox {
  type: 'box'
  layout: 'vertical' | 'horizontal'
  contents: FlexComponent[]
  backgroundColor?: string
  paddingAll?: string
  margin?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlexComponent = Record<string, any>
