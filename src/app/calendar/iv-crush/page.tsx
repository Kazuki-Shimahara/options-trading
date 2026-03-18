'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  getEventsForYear,
  type EventCategory,
} from '@/lib/events'
import {
  analyzeIvCrushPatterns,
  calculateIvCrushStats,
  compareCurrentIvToHistory,
  type IvDataPoint,
  type IvCrushPattern,
  type IvCrushStats,
} from '@/lib/iv-crush'

// IV Crushが発生しやすいイベントカテゴリ
const CRUSH_CATEGORIES: EventCategory[] = ['sq', 'fomc', 'boj', 'fomc_press', 'boj_press']

const categoryLabels: Record<string, string> = {
  sq: 'SQ日',
  fomc: 'FOMC',
  boj: '日銀会合',
  fomc_press: 'FRB記者会見',
  boj_press: '日銀記者会見',
  all: '全イベント',
}

// デモ用IV履歴データ生成（実運用ではSupabaseから取得）
function generateDemoIvData(year: number): IvDataPoint[] {
  const data: IvDataPoint[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  let iv = 22

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // skip weekends

    // Simulate IV with random walk + mean reversion
    const meanRevert = (22 - iv) * 0.05
    const noise = (Math.random() - 0.5) * 2
    iv = Math.max(10, Math.min(50, iv + meanRevert + noise))

    // Spike IV around SQ and FOMC dates
    const month = d.getMonth() + 1
    const day = d.getDate()
    const events = getEventsForYear(year).filter(
      (e) =>
        CRUSH_CATEGORIES.includes(e.category) &&
        e.date.getMonth() === d.getMonth() &&
        Math.abs(e.date.getDate() - day) <= 3
    )
    if (events.length > 0) {
      const eventDay = events[0].date.getDate()
      if (day <= eventDay) {
        iv += 1.5 // pre-event IV buildup
      } else {
        iv -= 2.5 // post-event IV crush
      }
    }

    const m = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    data.push({ date: `${year}-${m}-${dd}`, iv: Math.round(iv * 100) / 100 })
  }

  return data
}

function CrushStatsCard({ title, stats }: { title: string; stats: IvCrushStats }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h3 className="text-[10px] font-medium text-[#00d4aa]/70 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {stats.count === 0 ? (
        <p className="text-sm text-[#555]">データなし</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#555]">イベント数</p>
            <p className="text-lg font-bold text-white">{stats.count}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#555]">平均Crush幅</p>
            <p className="text-lg font-bold text-[#ff6b6b]">
              -{stats.avgCrushAmount.toFixed(1)}pt
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#555]">中央値</p>
            <p className="text-sm font-semibold text-[#ccc]">
              -{stats.medianCrushAmount.toFixed(1)}pt
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#555]">最大Crush幅</p>
            <p className="text-sm font-semibold text-[#ff6b6b]">
              -{stats.maxCrushAmount.toFixed(1)}pt
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-[#555]">平均Crush率</p>
            <p className="text-sm font-semibold text-[#f0b429]">
              -{stats.avgCrushPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function PatternRow({ pattern }: { pattern: IvCrushPattern }) {
  const eventDate = pattern.event.date
  const dateStr = `${eventDate.getMonth() + 1}/${eventDate.getDate()}`

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {pattern.event.title}
        </p>
        <p className="text-[10px] text-[#555]">{dateStr}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-[#888]">
          {pattern.peakIv.toFixed(1)} → {pattern.postIv.toFixed(1)}
        </p>
        <p className="text-sm font-bold text-[#ff6b6b]">
          -{pattern.crushAmount.toFixed(1)}pt ({pattern.crushPercent.toFixed(1)}%)
        </p>
      </div>
    </div>
  )
}

function ComparisonCard({
  currentIv,
  historicalPeaks,
}: {
  currentIv: number
  historicalPeaks: number[]
}) {
  const comparison = compareCurrentIvToHistory(currentIv, historicalPeaks)
  if (!comparison) return null

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h3 className="text-[10px] font-medium text-[#00d4aa]/70 uppercase tracking-wider mb-3">
        現在のIV水準（過去比較）
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#555]">現在IV</p>
          <p className="text-lg font-bold text-white">{currentIv.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#555]">過去平均</p>
          <p className="text-lg font-bold text-[#888]">
            {comparison.historicalAvg.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#555]">パーセンタイル</p>
          <p
            className={`text-lg font-bold ${
              comparison.percentile >= 75
                ? 'text-[#ff6b6b]'
                : comparison.percentile >= 50
                ? 'text-[#f0b429]'
                : 'text-[#00d4aa]'
            }`}
          >
            {comparison.percentile.toFixed(0)}%
          </p>
        </div>
      </div>
      <p className="text-xs mt-2 text-[#555]">
        {comparison.isAboveAvg
          ? '現在のIVは過去のイベント前ピークより高い水準です。IV Crushの恩恵が大きくなる可能性があります。'
          : '現在のIVは過去のイベント前ピークより低い水準です。'}
      </p>
    </div>
  )
}

export default function IvCrushPage() {
  const [year, setYear] = useState(2026)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [daysAround, setDaysAround] = useState(5)

  const ivData = useMemo(() => generateDemoIvData(year), [year])

  const allEvents = useMemo(() => {
    return getEventsForYear(year).filter((e) =>
      CRUSH_CATEGORIES.includes(e.category)
    )
  }, [year])

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'all') return allEvents
    return allEvents.filter((e) => e.category === selectedCategory)
  }, [allEvents, selectedCategory])

  const patterns = useMemo(
    () => analyzeIvCrushPatterns(filteredEvents, ivData, daysAround),
    [filteredEvents, ivData, daysAround]
  )

  const stats = useMemo(() => calculateIvCrushStats(patterns), [patterns])

  // Stats by category
  const statsByCategory = useMemo(() => {
    const result: Record<string, IvCrushStats> = {}
    for (const cat of CRUSH_CATEGORIES) {
      const catEvents = allEvents.filter((e) => e.category === cat)
      const catPatterns = analyzeIvCrushPatterns(catEvents, ivData, daysAround)
      result[cat] = calculateIvCrushStats(catPatterns)
    }
    return result
  }, [allEvents, ivData, daysAround])

  // Current IV comparison (use latest IV data point)
  const currentIv = ivData.length > 0 ? ivData[ivData.length - 1].iv : null
  const historicalPeaks = patterns.map((p) => p.peakIv)

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link
            href="/calendar"
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← カレンダー
          </Link>
          <h1 className="text-lg font-bold text-white">IV Crush分析</h1>
          <div className="w-16" />
        </div>

        {/* Year selector */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setYear(year - 1)}
            className="px-3 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            ←
          </button>
          <span className="text-base font-semibold text-white">{year}年</span>
          <button
            onClick={() => setYear(year + 1)}
            className="px-3 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            →
          </button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', ...CRUSH_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30'
                  : 'bg-[#111] text-[#666] border border-[#1e1e1e] hover:text-[#888]'
              }`}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Days around selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[#555]">分析期間:</span>
          {[3, 5, 7, 10].map((n) => (
            <button
              key={n}
              onClick={() => setDaysAround(n)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                daysAround === n
                  ? 'bg-[#1a1a1a] text-white'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              ±{n}日
            </button>
          ))}
        </div>

        {/* Current IV comparison */}
        {currentIv && historicalPeaks.length > 0 && (
          <div className="mb-4">
            <ComparisonCard
              currentIv={currentIv}
              historicalPeaks={historicalPeaks}
            />
          </div>
        )}

        {/* Overall stats */}
        <div className="mb-4">
          <CrushStatsCard
            title={`${categoryLabels[selectedCategory]}のIV Crush統計`}
            stats={stats}
          />
        </div>

        {/* Stats by category (when "all" is selected) */}
        {selectedCategory === 'all' && (
          <div className="grid grid-cols-1 gap-3 mb-4">
            {CRUSH_CATEGORIES.map((cat) => (
              <CrushStatsCard
                key={cat}
                title={`${categoryLabels[cat]}`}
                stats={statsByCategory[cat]}
              />
            ))}
          </div>
        )}

        {/* Pattern list */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h3 className="text-[10px] font-medium text-[#00d4aa]/70 uppercase tracking-wider mb-3">
            IV Crushパターン一覧（{patterns.length}件）
          </h3>
          {patterns.length === 0 ? (
            <p className="text-sm text-[#555]">パターンが見つかりません</p>
          ) : (
            <div className="space-y-1.5">
              {patterns.map((pattern) => (
                <PatternRow key={pattern.event.id} pattern={pattern} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg">
          <p className="text-[10px] text-[#555] leading-relaxed">
            IV Crush（ボラティリティ・クラッシュ）とは、重要イベント（SQ、FOMC、日銀会合等）の通過後にインプライド・ボラティリティが急低下する現象です。
            イベント前はヘッジ需要等でIVが上昇し、イベント通過で不確実性が解消されIVが低下します。
            オプション売り戦略では、このIV低下が利益の源泉となります。
          </p>
        </div>
      </div>
    </main>
  )
}
