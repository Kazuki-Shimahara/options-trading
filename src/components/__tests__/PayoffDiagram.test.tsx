// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PayoffDiagram } from '../PayoffDiagram'
import type { PayoffPosition } from '@/lib/payoff'

afterEach(() => {
  cleanup()
})

describe('PayoffDiagram', () => {
  it('ポジションが空の場合に空状態メッセージを表示する', () => {
    render(<PayoffDiagram positions={[]} />)
    expect(screen.getByText('ポジションがありません')).toBeDefined()
  })

  it('ポジションがある場合にチャートコンテナを表示する', () => {
    const positions: PayoffPosition[] = [
      {
        trade_type: 'call',
        strike_price: 30000,
        entry_price: 500,
        quantity: 1,
        side: 'buy',
        is_mini: false,
      },
    ]
    render(<PayoffDiagram positions={positions} />)
    expect(screen.getByTestId('payoff-diagram')).toBeDefined()
  })

  it('最大利益・最大損失・損益分岐点を表示する', () => {
    const positions: PayoffPosition[] = [
      {
        trade_type: 'call',
        strike_price: 30000,
        entry_price: 500,
        quantity: 1,
        side: 'buy',
        is_mini: false,
      },
    ]
    render(<PayoffDiagram positions={positions} />)
    expect(screen.getByText('最大利益')).toBeDefined()
    expect(screen.getByText('最大損失')).toBeDefined()
    expect(screen.getByText('損益分岐点')).toBeDefined()
  })

  it('ポジション凡例を表示する', () => {
    const positions: PayoffPosition[] = [
      {
        trade_type: 'call',
        strike_price: 30000,
        entry_price: 500,
        quantity: 1,
        side: 'buy',
        is_mini: false,
      },
      {
        trade_type: 'put',
        strike_price: 29000,
        entry_price: 300,
        quantity: 1,
        side: 'sell',
        is_mini: false,
      },
    ]
    render(<PayoffDiagram positions={positions} />)
    expect(screen.getByText('合成損益')).toBeDefined()
    expect(screen.getByText(/買 コール 30,000円/)).toBeDefined()
    expect(screen.getByText(/売 プット 29,000円/)).toBeDefined()
  })

  it('ミニオプションの場合に表示する', () => {
    const positions: PayoffPosition[] = [
      {
        trade_type: 'call',
        strike_price: 30000,
        entry_price: 500,
        quantity: 1,
        side: 'buy',
        is_mini: true,
      },
    ]
    render(<PayoffDiagram positions={positions} />)
    expect(screen.getByText(/ミニ/)).toBeDefined()
  })
})
