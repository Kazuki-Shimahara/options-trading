'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlaybookForm } from '@/components/PlaybookForm'
import { createPlaybook } from '@/app/actions/playbooks'

export default function NewPlaybookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(data: { name: string; rules: Array<{ id: string; category: string; description: string }> }) {
    setLoading(true)
    const result = await createPlaybook(data)
    if (!result.success) {
      setLoading(false)
      throw new Error(result.error)
    }
    router.push('/playbooks')
    router.refresh()
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between py-4">
          <Link href="/playbooks" className="text-[#666] hover:text-[#888] text-sm transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">Playbook作成</h1>
          <div className="w-10" />
        </div>
        <PlaybookForm
          onSubmit={handleSubmit}
          submitLabel="作成する"
          loading={loading}
        />
      </div>
    </main>
  )
}
