import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/types/database'
import DeleteButton from './DeleteButton'

async function getTrade(id: string): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Trade
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

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          ← 売買履歴
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
              isCall
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}>
              {trade.trade_type.toUpperCase()}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-lg ${
              isOpen
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {isOpen ? '未決済' : '決済済'}
            </span>
          </div>
          {trade.pnl !== null && (
            <span className={`text-2xl font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()}円
            </span>
          )}
        </div>

        {/* Detail Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
          <div className="divide-y divide-slate-800">
            <Row label="権利行使価格">
              <span className="text-lg font-semibold text-slate-100">{trade.strike_price.toLocaleString()}円</span>
            </Row>
            <Row label="限月（SQ日）">{trade.expiry_date ?? '—'}</Row>
            <Row label="取引日">{trade.trade_date}</Row>
            <Row label="枚数">{trade.quantity} 枚</Row>
            <Row label="購入価格">
              <span className="font-mono">{trade.entry_price} 円</span>
            </Row>
            {trade.exit_price !== null && (
              <Row label="決済価格">
                <span className="font-mono">{trade.exit_price} 円</span>
              </Row>
            )}
            {trade.exit_date && (
              <Row label="決済日">{trade.exit_date}</Row>
            )}
            {trade.iv_at_entry !== null && (
              <Row label="IV（エントリー時）">
                <span className="font-mono text-blue-400">{trade.iv_at_entry}%</span>
              </Row>
            )}
          </div>

          {trade.memo && (
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-800/30">
              <p className="text-xs text-slate-300 mb-2 uppercase tracking-widest">エントリー理由・メモ</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{trade.memo}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isOpen && (
            <Link
              href={`/trades/${trade.id}/edit?settle=true`}
              className="flex-1 text-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              決済を記録
            </Link>
          )}
          <Link
            href={`/trades/${trade.id}/edit`}
            className="flex-1 text-center py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
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
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-sm text-slate-200">{children}</span>
    </div>
  )
}
