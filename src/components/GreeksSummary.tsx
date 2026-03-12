'use client'

import type { Greeks } from '@/lib/greeks'
import type { DeltaNeutralResult } from '@/lib/greeks'

interface GreeksSummaryProps {
  greeks: Greeks
  deltaNeutral: DeltaNeutralResult
}

export function GreeksSummary({ greeks, deltaNeutral }: GreeksSummaryProps) {
  const greeksItems = [
    { label: 'Delta', value: greeks.delta, decimals: 4, key: 'delta' },
    { label: 'Gamma', value: greeks.gamma, decimals: 6, key: 'gamma' },
    { label: 'Theta', value: greeks.theta, decimals: 2, key: 'theta', suffix: '/日' },
    { label: 'Vega', value: greeks.vega, decimals: 2, key: 'vega' },
  ]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400" />
        ポートフォリオ Greeks
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {greeksItems.map((item) => (
          <div key={item.key}>
            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
            <p className="text-lg font-bold text-slate-100 tabular-nums">
              {item.value.toFixed(item.decimals)}
              {item.suffix && (
                <span className="text-xs font-normal text-slate-500 ml-0.5">
                  {item.suffix}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* デルタ中立乖離度 */}
      <div className={`rounded-xl px-4 py-3 border ${
        deltaNeutral.isWarning
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-800/50 border-slate-700/50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">デルタ中立乖離度</p>
            <p className={`text-xl font-bold tabular-nums ${
              deltaNeutral.isWarning ? 'text-red-400' : 'text-slate-100'
            }`}>
              {deltaNeutral.deviation.toFixed(4)}
            </p>
          </div>
          {deltaNeutral.isWarning && (
            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              閾値超過
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
