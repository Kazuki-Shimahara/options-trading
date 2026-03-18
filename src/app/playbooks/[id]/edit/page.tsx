'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { parsePlaybook } from '@/lib/playbook-schema'
import { PlaybookForm } from '@/components/PlaybookForm'
import { updatePlaybook } from '@/app/actions/playbooks'
import type { Playbook } from '@/lib/playbook-schema'

export default function EditPlaybookPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [playbook, setPlaybook] = useState<Playbook | null>(null)
  const [playbookId, setPlaybookId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setPlaybookId(id)
      createBrowserSupabaseClient()
        .from('playbooks')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            router.push('/playbooks')
            return
          }
          setPlaybook(parsePlaybook(data))
        })
    })
  }, [params, router])

  async function handleSubmit(data: { name: string; rules: Array<{ id: string; category: string; description: string }> }) {
    if (!playbookId) return
    setLoading(true)
    const result = await updatePlaybook(playbookId, data)
    if (!result.success) {
      setLoading(false)
      throw new Error(result.error)
    }
    router.push(`/playbooks/${playbookId}`)
    router.refresh()
  }

  if (!playbook) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between py-4">
          <Link
            href={`/playbooks/${playbookId}`}
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">Playbook編集</h1>
          <div className="w-10" />
        </div>
        <PlaybookForm
          initialName={playbook.name}
          initialRules={playbook.rules}
          onSubmit={handleSubmit}
          submitLabel="変更を保存"
          loading={loading}
        />
      </div>
    </main>
  )
}
