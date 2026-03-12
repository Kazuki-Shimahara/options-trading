'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getFilterDescription } from '@/lib/signal-filters'
import type { UserPreference, TradingStyleValue } from '@/types/database'

const styleOptions: { value: TradingStyleValue; label: string }[] = [
  { value: 'buy_focused', label: '買い中心' },
  { value: 'sell_focused', label: '売り中心' },
  { value: 'all', label: '全表示（上級者向け）' },
]

export default function SettingsPage() {
  const [tradingStyle, setTradingStyle] = useState<TradingStyleValue>('all')
  const [preferenceId, setPreferenceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPreferences() {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .limit(1)
        .single()

      if (!error && data) {
        const pref = data as UserPreference
        setTradingStyle(pref.trading_style)
        setPreferenceId(pref.id)
      }
      setLoading(false)
    }
    loadPreferences()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    if (preferenceId) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ trading_style: tradingStyle })
        .eq('id', preferenceId)

      if (error) {
        setMessage('保存に失敗しました')
      } else {
        setMessage('設定を保存しました')
      }
    } else {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({ trading_style: tradingStyle })
        .select()
        .single()

      if (error) {
        setMessage('保存に失敗しました')
      } else {
        setPreferenceId((data as UserPreference).id)
        setMessage('設定を保存しました')
      }
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[#555]">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="py-4">
          <h1 className="text-lg font-bold text-white">メニュー</h1>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h2 className="text-[10px] font-medium text-[#00d4aa]/70 uppercase tracking-wider mb-3">
            取引スタイル
          </h2>
          <p className="text-xs text-[#666] mb-4">
            取引スタイルに応じてIVシグナル通知をフィルタリングします。
          </p>

          <div className="space-y-2">
            {styleOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tradingStyle === option.value
                    ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                    : 'border-[#2a2a2a] hover:border-[#333] bg-[#0a0a0a]'
                }`}
              >
                <input
                  type="radio"
                  name="tradingStyle"
                  value={option.value}
                  checked={tradingStyle === option.value}
                  onChange={() => setTradingStyle(option.value)}
                  className="mt-0.5 accent-[#00d4aa]"
                />
                <div>
                  <span className="text-sm font-medium text-white">
                    {option.label}
                  </span>
                  <p className="text-[10px] text-[#666] mt-0.5">
                    {getFilterDescription(option.value)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-black bg-[#00d4aa] hover:bg-[#00c49a] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>

          {message && (
            <p
              className={`mt-3 text-xs text-center ${
                message.includes('失敗') ? 'text-[#ff6b6b]' : 'text-[#00d4aa]'
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
