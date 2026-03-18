'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePlaybook } from '@/app/actions/playbooks'

export function DeletePlaybookButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    const result = await deletePlaybook(id)
    if (result.success) {
      router.push('/playbooks')
      router.refresh()
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 py-2.5 bg-[#ff6b6b] text-white text-sm font-semibold rounded-lg hover:bg-[#ff5555] transition-colors"
        >
          削除する
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-2.5 bg-[#1a1a1a] text-[#888] text-sm rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors"
        >
          キャンセル
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full py-2.5 text-[#ff6b6b] text-sm border border-[#ff6b6b]/20 rounded-lg hover:bg-[#ff6b6b]/10 transition-colors"
    >
      このPlaybookを削除
    </button>
  )
}
