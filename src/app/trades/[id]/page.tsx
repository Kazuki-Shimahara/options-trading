import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseTrade, type Trade } from '@/lib/trade-schema'
import { calculatePOP } from '@/lib/pop'
import DeleteButton from './DeleteButton'

async function getTrade(id: string): Promise<Trade | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return parseTrade(data)
}

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trade = await getTrade(id)

  if (!trade) notFound()

  const isOpen = trade.status === 'open'
  const isCall = trade.trade_type === 'call'

  // POP計算（IV・デルタ情報がある場合）
  let pop: number | null = null
  if (trade.iv_at_entry !== null && trade.expiry_date) {
    const now = new Date()
    const expiry = new Date(trade.expiry_date)
    const diffMs = expiry.getTime() - now.getTime()
    const timeToExpiry = diffMs / (1000 * 60 * 60 * 24 * 365)

    if (timeToExpiry > 0) {
      pop = calculatePOP({
        spot: trade.strike_price, // 近似: ストライク価格を原資産として使用
        strike: trade.strike_price,
        entryPrice: trade.entry_price,
        timeToExpiry,
        volatility: trade.iv_at_entry / 100,
        riskFreeRate: 0.001,
        dividendYield: 0.02,
        optionType: trade.trade_type,
        side: 'buy',
      })
    }
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link
            href="/trades"
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">
            OP {trade.trade_type.toUpperCase()} {trade.strike_price.toLocaleString()}
          </h1>
          <div className="w-10" />
        </div>

        {/* Status & PnL */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${
              isCall
                ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
            }`}>
              {trade.trade_type.toUpperCase()}
            </span>
            {trade.is_mini && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20">
                ミニ
              </span>
            )}
            <span className={`text-[10px] px-2 py-1 rounded ${
              isOpen
                ? 'bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20'
                : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a]'
            }`}>
              {isOpen ? '未決済' : '決済済'}
            </span>
          </div>
          {trade.pnl !== null && (
            <span className={`text-xl font-bold tabular-nums ${trade.pnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()}円
            </span>
          )}
        </div>

        {/* Detail Card */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden mb-4">
          <div className="divide-y divide-[#1e1e1e]">
            <Row label="権利行使価格">
              <span className="text-base font-semibold text-white">{trade.strike_price.toLocaleString()}円</span>
            </Row>
            <Row label="限月（SQ日）">{trade.expiry_date ?? '—'}</Row>
            <Row label="取引日">{trade.trade_date}</Row>
            <Row label="枚数">{trade.quantity} 枚</Row>
            <Row label="取引単位">{trade.is_mini ? 'ミニ (×100)' : '通常 (×1000)'}</Row>
            <Row label="購入価格">
              <span className="font-mono text-white">{trade.entry_price} 円</span>
            </Row>
            {trade.exit_price !== null && (
              <Row label="決済価格">
                <span className="font-mono text-white">{trade.exit_price} 円</span>
              </Row>
            )}
            {trade.exit_date && (
              <Row label="決済日">{trade.exit_date}</Row>
            )}
            {trade.iv_at_entry !== null && (
              <Row label="IV">
                <span className="font-mono text-[#00d4aa]">{trade.iv_at_entry}%</span>
              </Row>
            )}
            {pop !== null && (
              <Row label="POP（利益確率）">
                <span className={`font-mono font-semibold ${pop >= 50 ? 'text-[#00d4aa]' : 'text-[#f0b429]'}`}>
                  {pop}%
                </span>
              </Row>
            )}
            {trade.confidence_level !== null && (
              <Row label="自信度">
                <span className="font-mono text-[#00d4aa]">{trade.confidence_level} / 5</span>
              </Row>
            )}
            {trade.emotion && (
              <Row label="感情">
                <span className="text-white">{trade.emotion}</span>
              </Row>
            )}
          </div>

          {trade.memo && (
            <div className="px-4 py-3 border-t border-[#1e1e1e] bg-[#0a0a0a]">
              <p className="text-[10px] text-[#00d4aa]/70 mb-1 uppercase tracking-wider">メモ</p>
              <p className="text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed">{trade.memo}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isOpen && (
            <Link
              href={`/trades/${trade.id}/edit?settle=true`}
              className="flex-1 text-center py-2.5 bg-[#00d4aa] hover:bg-[#00c49a] text-black text-sm font-medium rounded-lg transition-colors"
            >
              決済を記録
            </Link>
          )}
          <Link
            href={`/trades/${trade.id}/edit`}
            className="flex-1 text-center py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] text-sm font-medium rounded-lg transition-colors"
          >
            編集
          </Link>
          <DeleteButton tradeId={trade.id} />
        </div>
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-[#00d4aa]/70">{label}</span>
      <span className="text-sm text-[#ccc]">{children}</span>
    </div>
  )
}
