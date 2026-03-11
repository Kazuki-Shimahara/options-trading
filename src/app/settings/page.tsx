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
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">通知設定</h1>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            取引スタイル
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            取引スタイルに応じてIVシグナル通知をフィルタリングします。
          </p>

          <div className="space-y-3">
            {styleOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                  tradingStyle === option.value
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="tradingStyle"
                  value={option.value}
                  checked={tradingStyle === option.value}
                  onChange={() => setTradingStyle(option.value)}
                  className="mt-1 accent-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-white">
                    {option.label}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {getFilterDescription(option.value)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>

          {message && (
            <p
              className={`mt-4 text-sm text-center ${
                message.includes('失敗') ? 'text-red-400' : 'text-emerald-400'
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
