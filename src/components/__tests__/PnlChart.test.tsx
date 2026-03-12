// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PnlChart } from '../PnlChart'
import type { PnlChartDataPoint } from '@/lib/pnl-chart-data'

afterEach(() => {
  cleanup()
})

describe('PnlChart', () => {
  it('データ0件時に空状態メッセージを表示する', () => {
    render(<PnlChart data={[]} />)
    expect(screen.getByText('決済済み取引がありません')).toBeDefined()
  })

  it('データがある場合にチャートコンテナを表示する', () => {
    const data: PnlChartDataPoint[] = [
      { date: '2025-01-15', daily: 50000, cumulative: 50000 },
      { date: '2025-01-20', daily: -20000, cumulative: 30000 },
    ]
    render(<PnlChart data={data} />)
    expect(screen.getByTestId('pnl-chart-container')).toBeDefined()
  })

  it('累計損益チャートと日次損益チャートの両方が表示される', () => {
    const data: PnlChartDataPoint[] = [
      { date: '2025-01-15', daily: 50000, cumulative: 50000 },
    ]
    render(<PnlChart data={data} />)
    expect(screen.getByText('累計損益推移')).toBeDefined()
    expect(screen.getByText('日次損益')).toBeDefined()
  })
})
