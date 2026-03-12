import type { Trade } from '@/types/database'

export const CSV_HEADERS = [
  '取引ID',
  '取引日',
  '種別',
  '権利行使価格',
  '限月',
  '枚数',
  '購入価格',
  '決済価格',
  '決済日',
  '損益',
  'ステータス',
  'IV',
  'エントリー理由',
  '敗因タグ',
] as const

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function tradeToRow(trade: Trade): string {
  const fields: string[] = [
    trade.id,
    trade.trade_date,
    trade.trade_type,
    String(trade.strike_price),
    trade.expiry_date,
    String(trade.quantity),
    String(trade.entry_price),
    trade.exit_price !== null ? String(trade.exit_price) : '',
    trade.exit_date ?? '',
    trade.pnl !== null ? String(trade.pnl) : '',
    trade.status,
    trade.iv_at_entry !== null ? String(trade.iv_at_entry) : '',
    trade.memo ?? '',
    trade.defeat_tags ? trade.defeat_tags.join(';') : '',
  ]
  return fields.map(escapeCsvField).join(',')
}

export function generateCsv(trades: Trade[]): string {
  const BOM = '\uFEFF'
  const header = CSV_HEADERS.join(',')
  const rows = trades.map(tradeToRow)
  return BOM + [header, ...rows].join('\r\n') + '\r\n'
}
