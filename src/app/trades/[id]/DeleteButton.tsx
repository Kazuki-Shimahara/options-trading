'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteTrade } from '@/app/actions/trades'

export default function DeleteButton({ tradeId }: { tradeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('この取引記録を削除しますか？この操作は元に戻せません。')) return

    setLoading(true)
    const result = await deleteTrade(tradeId)

    if (!result.success) {
      alert('削除に失敗しました: ' + result.error)
      setLoading(false)
      return
    }

    router.push('/trades')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#ff6b6b]/10 border border-[#2a2a2a] hover:border-[#ff6b6b]/30 text-[#666] hover:text-[#ff6b6b] text-sm font-medium rounded-lg transition-all disabled:opacity-50"
    >
      {loading ? '...' : '削除'}
    </button>
  )
}
