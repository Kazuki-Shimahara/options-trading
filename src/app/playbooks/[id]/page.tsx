import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parsePlaybook } from '@/lib/playbook-schema'
import {
  calculateComplianceRate,
  calculatePlaybookComplianceStats,
  crossAnalyzeViolationsAndDefeatTags,
} from '@/lib/playbook'
import type { PlaybookComplianceTrade } from '@/lib/playbook'
import { DeletePlaybookButton } from './DeletePlaybookButton'

const CATEGORY_LABELS: Record<string, string> = {
  entry: 'エントリー条件',
  position_size: 'ポジションサイズ',
  stop_loss: '損切りルール',
}

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: pbData, error: pbError } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', id)
    .single()

  if (pbError || !pbData) {
    notFound()
  }

  const playbook = parsePlaybook(pbData)

  const { data: tradesData } = await supabase
    .from('trades')
    .select('playbook_compliance, defeat_tags, pnl')
    .eq('playbook_id', id)

  const trades: PlaybookComplianceTrade[] = (tradesData ?? []).map((t) => ({
    playbook_compliance: t.playbook_compliance as boolean | null,
    defeat_tags: t.defeat_tags as string[] | null,
    pnl: t.pnl as number | null,
  }))

  const complianceRate = calculateComplianceRate(trades)
  const stats = calculatePlaybookComplianceStats(trades)
  const crossAnalysis = crossAnalyzeViolationsAndDefeatTags(trades)

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between py-4">
          <Link href="/playbooks" className="text-[#666] hover:text-[#888] text-sm transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">{playbook.name}</h1>
          <Link
            href={`/playbooks/${id}/edit`}
            className="text-[#00d4aa] hover:text-[#00e4ba] text-sm font-medium transition-colors"
          >
            編集
          </Link>
        </div>

        {/* Rules */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 mb-4">
          <h2 className="text-[10px] font-medium text-[#00d4aa]/80 mb-3 tracking-wider uppercase">
            ルール一覧
          </h2>
          <div className="space-y-2">
            {playbook.rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3"
              >
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]">
                  {CATEGORY_LABELS[rule.category] ?? rule.category}
                </span>
                <p className="text-sm text-white mt-1.5">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Dashboard */}
        {trades.length > 0 ? (
          <>
            {/* Compliance Rate */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 mb-4">
              <h2 className="text-[10px] font-medium text-[#00d4aa]/80 mb-3 tracking-wider uppercase">
                遵守率
              </h2>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white tabular-nums">
                  {complianceRate.toFixed(1)}
                </span>
                <span className="text-sm text-[#666] mb-1">%</span>
              </div>
              <p className="text-[10px] text-[#555] mt-1">
                対象取引: {trades.filter((t) => t.playbook_compliance !== null).length}件
              </p>
            </div>

            {/* Compliant vs Non-compliant Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <h3 className="text-[10px] text-[#00d4aa]/70 mb-2 tracking-wider uppercase">
                  ルール遵守
                </h3>
                <div className="space-y-1">
                  <p className="text-xs text-[#888]">
                    取引数: <span className="text-white font-semibold">{stats.compliant.total}</span>
                  </p>
                  <p className="text-xs text-[#888]">
                    勝率: <span className="text-white font-semibold">{stats.compliant.winRate.toFixed(1)}%</span>
                  </p>
                  <p className="text-xs text-[#888]">
                    損益合計:{' '}
                    <span
                      className={`font-semibold ${
                        stats.compliant.totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                      }`}
                    >
                      {stats.compliant.totalPnl >= 0 ? '+' : ''}
                      {stats.compliant.totalPnl.toLocaleString()}円
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <h3 className="text-[10px] text-[#ff6b6b]/70 mb-2 tracking-wider uppercase">
                  ルール違反
                </h3>
                <div className="space-y-1">
                  <p className="text-xs text-[#888]">
                    取引数: <span className="text-white font-semibold">{stats.nonCompliant.total}</span>
                  </p>
                  <p className="text-xs text-[#888]">
                    勝率: <span className="text-white font-semibold">{stats.nonCompliant.winRate.toFixed(1)}%</span>
                  </p>
                  <p className="text-xs text-[#888]">
                    損益合計:{' '}
                    <span
                      className={`font-semibold ${
                        stats.nonCompliant.totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                      }`}
                    >
                      {stats.nonCompliant.totalPnl >= 0 ? '+' : ''}
                      {stats.nonCompliant.totalPnl.toLocaleString()}円
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Cross Analysis: Violations x Defeat Tags */}
            {crossAnalysis.length > 0 && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 mb-4">
                <h2 className="text-[10px] font-medium text-[#00d4aa]/80 mb-3 tracking-wider uppercase">
                  ルール違反 x 敗因タグ
                </h2>
                <div className="space-y-2">
                  {crossAnalysis.map((item) => (
                    <div
                      key={item.defeatTag}
                      className="flex items-center justify-between bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-white">{item.defeatTag}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#888]">
                          {item.violationCount}回
                        </span>
                        <span className="text-[10px] text-[#ff6b6b] font-mono">
                          {item.totalLoss.toLocaleString()}円
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center mb-4">
            <p className="text-[#666] text-sm">
              このPlaybookに紐付く取引はまだありません
            </p>
          </div>
        )}

        <DeletePlaybookButton id={id} />
      </div>
    </main>
  )
}
