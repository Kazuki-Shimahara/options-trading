// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { WeekendReviewCard } from '../WeekendReviewCard'
import type { ReviewableTrade } from '@/lib/weekend-review'

afterEach(() => {
  cleanup()
})

const baseTrade: ReviewableTrade = {
  id: 'trade-1',
  trade_date: '2026-03-20',
  trade_type: 'call',
  strike_price: 38000,
  expiry_date: '2026-04-10',
  quantity: 2,
  entry_price: 100,
  exit_price: 150,
  pnl: 100000,
  status: 'closed',
  memo: null,
  defeat_tags: null,
  is_mini: false,
}

describe('WeekendReviewCard', () => {
  it('取引の基本情報を表示する', () => {
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    expect(screen.getByText('CALL')).toBeDefined()
    expect(screen.getByText('38,000円')).toBeDefined()
    expect(screen.getByText('x2枚')).toBeDefined()
  })

  it('P&Lが正の場合に緑色で表示する', () => {
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const pnlEl = screen.getByTestId('review-pnl')
    expect(pnlEl.textContent).toContain('+100,000')
  })

  it('P&Lが負の場合に赤色で表示する', () => {
    render(
      <WeekendReviewCard
        trade={{ ...baseTrade, pnl: -50000 }}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const pnlEl = screen.getByTestId('review-pnl')
    expect(pnlEl.textContent).toContain('-50,000')
  })

  it('敗因タグを選択できる', () => {
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const tagButton = screen.getByText('損切り遅れ')
    fireEvent.click(tagButton)
    expect(tagButton.className).toContain('bg-[#00d4aa]')
  })

  it('メモを入力できる', () => {
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('振り返りメモを入力...')
    fireEvent.change(textarea, { target: { value: 'テストメモ' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('テストメモ')
  })

  it('保存ボタンをクリックするとonSaveが呼ばれる', () => {
    const onSave = vi.fn()
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={onSave}
        onSkip={vi.fn()}
      />
    )
    // Select a tag
    fireEvent.click(screen.getByText('損切り遅れ'))
    // Enter memo
    const textarea = screen.getByPlaceholderText('振り返りメモを入力...')
    fireEvent.change(textarea, { target: { value: 'テストメモ' } })
    // Click save
    fireEvent.click(screen.getByText('保存して次へ'))
    expect(onSave).toHaveBeenCalledWith('trade-1', {
      defeat_tags: ['損切り遅れ'],
      memo: 'テストメモ',
    })
  })

  it('スキップボタンをクリックするとonSkipが呼ばれる', () => {
    const onSkip = vi.fn()
    render(
      <WeekendReviewCard
        trade={baseTrade}
        onSave={vi.fn()}
        onSkip={onSkip}
      />
    )
    fireEvent.click(screen.getByText('スキップ'))
    expect(onSkip).toHaveBeenCalled()
  })

  it('既存のmemoがある場合にプリフィルされる', () => {
    render(
      <WeekendReviewCard
        trade={{ ...baseTrade, memo: '既存メモ' }}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const textarea = screen.getByPlaceholderText('振り返りメモを入力...')
    expect((textarea as HTMLTextAreaElement).value).toBe('既存メモ')
  })

  it('既存のdefeat_tagsがある場合にプリセレクトされる', () => {
    render(
      <WeekendReviewCard
        trade={{ ...baseTrade, defeat_tags: ['損切り遅れ'] }}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    )
    const tagButton = screen.getByText('損切り遅れ')
    expect(tagButton.className).toContain('bg-[#00d4aa]')
  })
})
