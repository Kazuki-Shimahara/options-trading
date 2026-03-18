import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PlaybookRule } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  entry: 'エントリー条件',
  position_size: 'ポジションサイズ',
  stop_loss: '損切りルール',
}

export default async function PlaybooksPage() {
  const supabase = await createServerSupabaseClient()
  const { data: playbooks } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: false })

  const items = (playbooks ?? []) as Array<{
    id: string
    name: string
    rules: PlaybookRule[]
    created_at: string
  }>

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-[#666] hover:text-[#888] text-sm transition-colors">
            ← ホーム
          </Link>
          <h1 className="text-lg font-bold text-white">Playbook</h1>
          <Link
            href="/playbooks/new"
            className="text-[#00d4aa] hover:text-[#00e4ba] text-sm font-medium transition-colors"
          >
            + 新規
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
            <p className="text-[#666] text-sm mb-4">Playbookがまだありません</p>
            <Link
              href="/playbooks/new"
              className="inline-block px-4 py-2 bg-[#00d4aa] text-black text-sm font-semibold rounded-lg hover:bg-[#00c49a] transition-colors"
            >
              最初のPlaybookを作成
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((pb) => (
              <Link
                key={pb.id}
                href={`/playbooks/${pb.id}`}
                className="block bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:bg-[#1a1a1a] transition-colors"
              >
                <h2 className="text-sm font-semibold text-white mb-2">{pb.name}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {pb.rules.map((rule) => (
                    <span
                      key={rule.id}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]"
                    >
                      {CATEGORY_LABELS[rule.category] ?? rule.category}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[#555] mt-2">
                  ルール {pb.rules.length}件
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
