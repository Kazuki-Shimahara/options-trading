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
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
        ポートフォリオ Greeks
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {greeksItems.map((item) => (
          <div key={item.key}>
            <p className="text-[10px] text-[#00d4aa]/70 mb-0.5">{item.label}</p>
            <p className="text-lg font-bold text-white tabular-nums font-mono">
              {item.value.toFixed(item.decimals)}
              {item.suffix && (
                <span className="text-[10px] font-normal text-[#555] ml-0.5">
                  {item.suffix}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* デルタ中立乖離度 */}
      <div className={`rounded-lg px-3 py-2.5 border ${
        deltaNeutral.isWarning
          ? 'bg-[#ff6b6b]/10 border-[#ff6b6b]/30'
          : 'bg-[#0a0a0a] border-[#1e1e1e]'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#888] mb-0.5">デルタ中立乖離度</p>
            <p className={`text-lg font-bold tabular-nums font-mono ${
              deltaNeutral.isWarning ? 'text-[#ff6b6b]' : 'text-white'
            }`}>
              {deltaNeutral.deviation.toFixed(4)}
            </p>
          </div>
          {deltaNeutral.isWarning && (
            <span className="text-[10px] font-medium px-2 py-1 rounded bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/30">
              閾値超過
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
