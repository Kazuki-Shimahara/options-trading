'use client'

import { useState } from 'react'
import type { PlaybookRuleCategory, PlaybookRule } from '@/types/database'

const inputClass =
  'w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors'

const labelClass = 'block text-[10px] font-medium text-[#00d4aa]/80 mb-1 tracking-wider uppercase'

const CATEGORIES: { value: PlaybookRuleCategory; label: string }[] = [
  { value: 'entry', label: 'エントリー条件' },
  { value: 'position_size', label: 'ポジションサイズ' },
  { value: 'stop_loss', label: '損切りルール' },
]

interface PlaybookFormProps {
  initialName?: string
  initialRules?: PlaybookRule[]
  onSubmit: (data: { name: string; rules: PlaybookRule[] }) => Promise<void>
  submitLabel: string
  loading?: boolean
}

export function PlaybookForm({
  initialName = '',
  initialRules = [],
  onSubmit,
  submitLabel,
  loading = false,
}: PlaybookFormProps) {
  const [name, setName] = useState(initialName)
  const [rules, setRules] = useState<PlaybookRule[]>(
    initialRules.length > 0
      ? initialRules
      : [{ id: crypto.randomUUID(), category: 'entry', description: '' }]
  )
  const [error, setError] = useState<string | null>(null)

  function addRule() {
    setRules([...rules, { id: crypto.randomUUID(), category: 'entry', description: '' }])
  }

  function removeRule(id: string) {
    if (rules.length <= 1) return
    setRules(rules.filter((r) => r.id !== id))
  }

  function updateRule(id: string, field: 'category' | 'description', value: string) {
    setRules(
      rules.map((r) =>
        r.id === id
          ? { ...r, [field]: field === 'category' ? (value as PlaybookRuleCategory) : value }
          : r
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Playbook名は必須です')
      return
    }

    const validRules = rules.filter((r) => r.description.trim())
    if (validRules.length === 0) {
      setError('ルールを1つ以上入力してください')
      return
    }

    try {
      await onSubmit({ name: name.trim(), rules: validRules })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <label className={labelClass}>Playbook名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: デルタニュートラル戦略"
          className={inputClass}
          required
        />
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>ルール</label>
          <button
            type="button"
            onClick={addRule}
            className="text-[#00d4aa] text-xs font-medium hover:text-[#00e4ba] transition-colors"
          >
            + ルール追加
          </button>
        </div>

        {rules.map((rule, index) => (
          <div key={rule.id} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#555]">ルール {index + 1}</span>
              {rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="text-[#ff6b6b] text-[10px] hover:text-[#ff8888] transition-colors"
                >
                  削除
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] text-[#888] mb-1">カテゴリ</label>
              <select
                value={rule.category}
                onChange={(e) => updateRule(rule.id, 'category', e.target.value)}
                className={`${inputClass} appearance-none`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#888] mb-1">ルール内容</label>
              <input
                type="text"
                value={rule.description}
                onChange={(e) => updateRule(rule.id, 'description', e.target.value)}
                placeholder="例: IV Rank 50以上の時のみエントリー"
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ff6b6b] text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#00d4aa] hover:bg-[#00c49a] disabled:opacity-50 text-black font-semibold rounded-lg transition-colors"
      >
        {loading ? '保存中...' : submitLabel}
      </button>
    </form>
  )
}
