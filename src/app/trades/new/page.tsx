'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrade } from '@/app/actions/trades'
import { calculateGreeks, type Greeks } from '@/lib/greeks'
import type { BSInputs } from '@/lib/black-scholes'
import { DEFEAT_TAG_CATEGORIES, MARKET_ENV_AXES, type DefeatTag } from '@/lib/tags'
import { useFormDraft } from '@/hooks/useFormDraft'
import { DatePicker } from '@/components/DatePicker'

interface TradeDraft {
  tradeType: 'call' | 'put'
  isMini: boolean
  tradeDate: string
  expiryDate: string
  strikePrice: string
  quantity: string
  entryPrice: string
  exitPrice: string
  exitDate: string
  ivAtEntry: string
  spotPrice: string
  memo: string
  defeatTags: string[]
  marketEnvTags: string[]
}

const DRAFT_KEY = 'draft:new-trade'

const createInitialDraft = (): TradeDraft => ({
  tradeType: 'call',
  isMini: false,
  tradeDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  strikePrice: '',
  quantity: '1',
  entryPrice: '',
  exitPrice: '',
  exitDate: '',
  ivAtEntry: '',
  spotPrice: '',
  memo: '',
  defeatTags: [],
  marketEnvTags: [],
})

const inputClass =
  'w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors'

const labelClass = 'block text-[10px] font-medium text-[#00d4aa]/80 mb-1 tracking-wider uppercase'

export default function NewTradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { values: draft, hasDraft, updateValues: updateDraft, clearDraft } = useFormDraft<TradeDraft>(DRAFT_KEY, createInitialDraft())
  const [greeks, setGreeks] = useState<Greeks | null>(null)

  const updateField = <K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) => {
    updateDraft({ ...draft, [key]: value })
  }

  const computeGreeks = useCallback(() => {
    const spot = parseFloat(draft.spotPrice)
    const strike = parseFloat(draft.strikePrice)
    const iv = parseFloat(draft.ivAtEntry)

    if (!spot || !strike || !iv || !draft.expiryDate) {
      setGreeks(null)
      return
    }

    const now = new Date()
    const expiry = new Date(draft.expiryDate)
    const diffMs = expiry.getTime() - now.getTime()
    const timeToExpiry = diffMs / (1000 * 60 * 60 * 24 * 365)

    if (timeToExpiry <= 0) {
      setGreeks(null)
      return
    }

    const inputs: BSInputs = {
      spot,
      strike,
      timeToExpiry,
      volatility: iv / 100,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      optionType: draft.tradeType,
    }

    try {
      const result = calculateGreeks(inputs)
      setGreeks(result)
    } catch {
      setGreeks(null)
    }
  }, [draft.spotPrice, draft.strikePrice, draft.ivAtEntry, draft.expiryDate, draft.tradeType])

  useEffect(() => {
    computeGreeks()
  }, [computeGreeks])

  function toggleDefeatTag(tag: string) {
    const prev = draft.defeatTags
    const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    updateField('defeatTags', next)
  }

  function toggleMarketEnvTag(axis: string, tag: string) {
    const prev = draft.marketEnvTags
    const axisConfig = MARKET_ENV_AXES[axis as keyof typeof MARKET_ENV_AXES]
    const axisTags = axisConfig.tags as readonly string[]
    const withoutAxis = prev.filter((t) => !axisTags.includes(t))
    const next = prev.includes(tag) ? withoutAxis : [...withoutAxis, tag]
    updateField('marketEnvTags', next)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createTrade({
      trade_date: draft.tradeDate,
      trade_type: draft.tradeType,
      is_mini: draft.isMini,
      strike_price: parseInt(draft.strikePrice),
      expiry_date: draft.expiryDate,
      quantity: parseInt(draft.quantity),
      entry_price: parseFloat(draft.entryPrice),
      exit_price: draft.exitPrice ? parseFloat(draft.exitPrice) : null,
      exit_date: draft.exitDate || null,
      iv_at_entry: draft.ivAtEntry ? parseFloat(draft.ivAtEntry) : null,
      memo: draft.memo || null,
      entry_delta: greeks?.delta ?? null,
      entry_gamma: greeks?.gamma ?? null,
      entry_theta: greeks?.theta ?? null,
      entry_vega: greeks?.vega ?? null,
      defeat_tags: draft.defeatTags.length > 0 ? draft.defeatTags : null,
      market_env_tags: draft.marketEnvTags.length > 0 ? draft.marketEnvTags : null,
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    clearDraft()
    router.push('/trades')
    router.refresh()
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link href="/trades" className="text-[#666] hover:text-[#888] text-sm transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">新規記録</h1>
          {hasDraft ? (
            <button
              type="button"
              onClick={clearDraft}
              className="text-[#ff6b6b] hover:text-[#ff8888] text-xs transition-colors"
            >
              下書き破棄
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CALL / PUT toggle */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <label className={labelClass}>種別</label>
            <div className="flex gap-2">
              {(['call', 'put'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateField('tradeType', t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    draft.tradeType === t
                      ? t === 'call'
                        ? 'bg-[#00d4aa] text-black'
                        : 'bg-[#ff6b6b] text-white'
                      : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:border-[#333]'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <input type="hidden" name="trade_type" value={draft.tradeType} />

            <label className={`${labelClass} mt-4`}>取引単位</label>
            <div className="flex gap-2">
              {([false, true] as const).map((mini) => (
                <button
                  key={mini ? 'mini' : 'standard'}
                  type="button"
                  onClick={() => updateField('isMini', mini)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    draft.isMini === mini
                      ? 'bg-[#00d4aa] text-black'
                      : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:border-[#333]'
                  }`}
                >
                  {mini ? 'ミニ (×100)' : '通常 (×1000)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <DatePicker
                label="取引日"
                value={draft.tradeDate}
                onChange={(v) => updateField('tradeDate', v)}
                required
              />
              <DatePicker
                label="限月（SQ日）"
                value={draft.expiryDate}
                onChange={(v) => updateField('expiryDate', v)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>権利行使価格</label>
                <input
                  name="strike_price"
                  type="number"
                  required
                  placeholder="39000"
                  value={draft.strikePrice}
                  onChange={(e) => updateField('strikePrice', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>枚数</label>
                <input
                  name="quantity"
                  type="number"
                  required
                  min="1"
                  value={draft.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>価格</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>購入価格（プレミアム）</label>
                <input
                  name="entry_price"
                  type="number"
                  step="0.01"
                  required
                  placeholder="150.5"
                  value={draft.entryPrice}
                  onChange={(e) => updateField('entryPrice', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IV（%）</label>
                <input
                  name="iv_at_entry"
                  type="number"
                  step="0.01"
                  placeholder="18.5"
                  value={draft.ivAtEntry}
                  onChange={(e) => updateField('ivAtEntry', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>先物価格（原資産）</label>
                <input
                  name="spot_price"
                  type="number"
                  step="0.01"
                  placeholder="38500"
                  value={draft.spotPrice}
                  onChange={(e) => updateField('spotPrice', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>決済価格（任意）</label>
                <input
                  name="exit_price"
                  type="number"
                  step="0.01"
                  placeholder="未決済は空欄"
                  value={draft.exitPrice}
                  onChange={(e) => updateField('exitPrice', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="決済日（任意）"
                value={draft.exitDate}
                onChange={(v) => updateField('exitDate', v)}
              />
            </div>
          </div>

          {/* Greeks */}
          {greeks && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <h2 className={labelClass}>Greeks（自動計算）</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Delta(δ)', value: `${greeks.delta >= 0 ? '+' : ''}${greeks.delta.toFixed(4)}` },
                  { label: 'Gamma(γ)', value: greeks.gamma.toFixed(6) },
                  { label: 'Theta(θ)', value: `${greeks.theta >= 0 ? '+' : ''}${greeks.theta.toFixed(2)}` },
                  { label: 'Vega(κ)', value: greeks.vega.toFixed(2) },
                ].map((g) => (
                  <div key={g.label} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-2.5 text-center">
                    <div className="text-[10px] text-[#00d4aa]/70 mb-0.5">{g.label}</div>
                    <div className="text-base font-mono font-semibold text-white">
                      {g.value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#444] mt-2">
                r=0.1%, q=2.0% で計算
              </p>
            </div>
          )}

          {/* Market Env Tags */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>市場環境タグ</h2>
            {Object.entries(MARKET_ENV_AXES).map(([axis, config]) => (
              <div key={axis}>
                <label className="block text-[10px] text-[#888] mb-1">{config.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {config.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMarketEnvTag(axis, tag)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        draft.marketEnvTags.includes(tag)
                          ? 'bg-[#00d4aa] text-black'
                          : 'bg-[#1a1a1a] text-[#666] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Defeat Tags */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>敗因タグ</h2>
            <p className="text-[10px] text-[#444]">該当するものを複数選択できます</p>
            {Object.entries(DEFEAT_TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category}>
                <label className="block text-[10px] text-[#888] mb-1">{category}</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: DefeatTag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDefeatTag(tag)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        draft.defeatTags.includes(tag)
                          ? 'bg-[#ff6b6b] text-white'
                          : 'bg-[#1a1a1a] text-[#666] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Memo */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h2 className={labelClass}>メモ</h2>
            <textarea
              name="memo"
              rows={3}
              placeholder="なぜこのタイミングでエントリーしたか..."
              value={draft.memo}
              onChange={(e) => updateField('memo', e.target.value)}
              className={`${inputClass} resize-none`}
            />
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
            {loading ? '保存中...' : '記録する'}
          </button>
        </form>
      </div>
    </main>
  )
}
