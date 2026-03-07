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

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <Link href="/trades" className="text-sm text-blue-600 hover:underline mb-1 block">
          &larr; 売買履歴
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">取引詳細</h1>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isOpen ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isOpen ? '未決済' : '決済済'}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 mb-4">
          <Row label="種別">
            <span
              className={`inline-block text-sm font-semibold px-2 py-0.5 rounded-full ${
                trade.trade_type === 'call'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {trade.trade_type.toUpperCase()}
            </span>
          </Row>
          <Row label="取引日">{trade.trade_date}</Row>
          <Row label="限月（SQ日）">{trade.expiry_date ?? '—'}</Row>
          <Row label="権利行使価格">{trade.strike_price.toLocaleString()} 円</Row>
          <Row label="枚数">{trade.quantity} 枚</Row>
          <Row label="購入価格（プレミアム）">{trade.entry_price} 円</Row>

          {trade.exit_price !== null && (
            <Row label="決済価格">{trade.exit_price} 円</Row>
          )}
          {trade.exit_date && (
            <Row label="決済日">{trade.exit_date}</Row>
          )}
          {trade.pnl !== null && (
            <Row label="損益">
              <span className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()} 円
              </span>
            </Row>
          )}
          {trade.iv_at_entry !== null && (
            <Row label="IV（エントリー時）">{trade.iv_at_entry}%</Row>
          )}
          {trade.memo && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-1">エントリー理由・メモ</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{trade.memo}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isOpen && (
            <Link
              href={`/trades/${trade.id}/edit?settle=true`}
              className="flex-1 text-center bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              決済を記録
            </Link>
          )}
          <Link
            href={`/trades/${trade.id}/edit`}
            className="flex-1 text-center bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
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
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  )
}
