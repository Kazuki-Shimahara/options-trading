// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { IvRankGauge } from '../IvRankGauge'

afterEach(() => {
  cleanup()
})

describe('IvRankGauge', () => {
  it('0-25未満の値で緑色（買い好機）を表示する', () => {
    render(<IvRankGauge ivRank={20} label="ATM Call" />)
    expect(screen.getByText('ATM Call')).toBeDefined()
    expect(screen.getByText('20.0')).toBeDefined()
    expect(screen.getByText('買い好機')).toBeDefined()
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.className).toContain('bg-[#00d4aa]')
  })

  it('25-75未満の値でグレー（中立）を表示する', () => {
    render(<IvRankGauge ivRank={50} label="ATM Put" />)
    expect(screen.getByText('50.0')).toBeDefined()
    expect(screen.getByText('中立')).toBeDefined()
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.className).toContain('bg-[#888]')
  })

  it('75以上の値で赤色（売り好機）を表示する', () => {
    render(<IvRankGauge ivRank={85} label="ATM Call" />)
    expect(screen.getByText('85.0')).toBeDefined()
    expect(screen.getByText('売り好機')).toBeDefined()
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.className).toContain('bg-[#ff6b6b]')
  })

  it('境界値25で中立を表示する', () => {
    render(<IvRankGauge ivRank={25} label="ATM Call" />)
    expect(screen.getByText('中立')).toBeDefined()
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.className).toContain('bg-[#888]')
  })

  it('境界値75で赤色を表示する', () => {
    render(<IvRankGauge ivRank={75} label="ATM Call" />)
    expect(screen.getByText('売り好機')).toBeDefined()
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.className).toContain('bg-[#ff6b6b]')
  })

  it('値0で正しく描画する', () => {
    render(<IvRankGauge ivRank={0} label="ATM Call" />)
    expect(screen.getByText('0.0')).toBeDefined()
    expect(screen.getByText('買い好機')).toBeDefined()
  })

  it('値100で正しく描画する', () => {
    render(<IvRankGauge ivRank={100} label="ATM Call" />)
    expect(screen.getByText('売り好機')).toBeDefined()
  })

  it('ゲージバーの幅がvalue%になる', () => {
    render(<IvRankGauge ivRank={60} label="ATM Call" />)
    const gauge = screen.getByTestId('iv-gauge-bar')
    expect(gauge.style.width).toBe('60%')
  })

  it('データ未取得時のフォールバック表示', () => {
    render(<IvRankGauge ivRank={null} label="ATM Call" />)
    expect(screen.getByText('データなし')).toBeDefined()
  })
})
