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
      className="px-4 py-2.5 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
    >
      {loading ? '...' : '削除'}
    </button>
  )
}
