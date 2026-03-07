'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DeleteButton({ tradeId }: { tradeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('この取引記録を削除しますか？この操作は元に戻せません。')) return

    setLoading(true)
    const { error } = await supabase.from('trades').delete().eq('id', tradeId)

    if (error) {
      alert('削除に失敗しました: ' + error.message)
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
      className="flex-1 bg-white border border-red-300 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? '削除中...' : '削除'}
    </button>
  )
}
