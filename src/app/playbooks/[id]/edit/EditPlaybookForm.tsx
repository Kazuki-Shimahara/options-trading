'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlaybookForm } from '@/components/PlaybookForm'
import { updatePlaybook } from '@/app/actions/playbooks'
import type { Playbook } from '@/lib/playbook-schema'

export default function EditPlaybookForm({
  playbook,
  playbookId,
}: {
  playbook: Playbook
  playbookId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(data: { name: string; rules: Array<{ id: string; category: string; description: string }> }) {
    setLoading(true)
    const result = await updatePlaybook(playbookId, data)
    if (!result.success) {
      setLoading(false)
      throw new Error(result.error)
    }
    router.push(`/playbooks/${playbookId}`)
    router.refresh()
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
