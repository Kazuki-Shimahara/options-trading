import { describe, it, expect } from 'vitest'
import { generateCsv, CSV_HEADERS } from '../csv-export'
import type { Trade } from '@/types/database'

const baseTrade: Trade = {
  id: '1',
  user_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  trade_date: '2024-01-15',
  trade_type: 'call',
  strike_price: 33000,
  expiry_date: '2024-02-09',
  quantity: 2,
  entry_price: 150,
  exit_price: 200,
  exit_date: '2024-01-20',
  pnl: 100000,
  iv_at_entry: 18.5,
  memo: 'テストメモ',
  status: 'closed',
  defeat_tags: ['損切り遅れ'],
  entry_delta: 0.3,
  entry_gamma: 0.01,
  entry_theta: -5.0,
  entry_vega: 10.0,
}

describe('CSV_HEADERS', () => {
  it('必要なヘッダーがすべて含まれている', () => {
    expect(CSV_HEADERS).toEqual([
      '取引ID',
      '取引日',
      '種別',
      '権利行使価格',
      '限月',
      '枚数',
      '購入価格',
      '決済価格',
      '決済日',
      '損益',
      'ステータス',
      'IV',
      'エントリー理由',
      '敗因タグ',
    ])
  })
})

describe('generateCsv', () => {
  it('UTF-8 BOM付きでCSVを生成する', () => {
    const csv = generateCsv([baseTrade])
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })

  it('ヘッダー行が正しい', () => {
    const csv = generateCsv([baseTrade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[0]).toBe(CSV_HEADERS.join(','))
  })

  it('取引データが正しくCSV行に変換される', () => {
    const csv = generateCsv([baseTrade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[1]).toBe(
      '1,2024-01-15,call,33000,2024-02-09,2,150,200,2024-01-20,100000,closed,18.5,テストメモ,損切り遅れ'
    )
  })

  it('null値は空文字として出力される', () => {
    const trade: Trade = {
      ...baseTrade,
      exit_price: null,
      exit_date: null,
      pnl: null,
      iv_at_entry: null,
      memo: null,
      defeat_tags: null,
    }
    const csv = generateCsv([trade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[1]).toBe(
      '1,2024-01-15,call,33000,2024-02-09,2,150,,,,closed,,,'
    )
  })

  it('カンマを含むフィールドはダブルクォートで囲まれる', () => {
    const trade: Trade = {
      ...baseTrade,
      memo: 'IV高め,エントリー',
    }
    const csv = generateCsv([trade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[1]).toContain('"IV高め,エントリー"')
  })

  it('ダブルクォートを含むフィールドはエスケープされる', () => {
    const trade: Trade = {
      ...baseTrade,
      memo: 'テスト"メモ',
    }
    const csv = generateCsv([trade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[1]).toContain('"テスト""メモ"')
  })

  it('改行を含むフィールドはダブルクォートで囲まれる', () => {
    const trade: Trade = {
      ...baseTrade,
      memo: 'テスト\nメモ',
    }
    const csv = generateCsv([trade])
    const dataContent = csv.replace('\uFEFF', '')
    expect(dataContent).toContain('"テスト\nメモ"')
  })

  it('空配列の場合はヘッダーのみ出力される', () => {
    const csv = generateCsv([])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[0]).toBe(CSV_HEADERS.join(','))
    // Only header + trailing empty from final \r\n
    expect(lines.filter((l) => l.length > 0)).toHaveLength(1)
  })

  it('複数取引が正しく出力される', () => {
    const trade2: Trade = {
      ...baseTrade,
      id: '2',
      trade_type: 'put',
      strike_price: 32000,
    }
    const csv = generateCsv([baseTrade, trade2])
    const lines = csv.replace('\uFEFF', '').split('\r\n').filter((l) => l.length > 0)
    expect(lines).toHaveLength(3) // header + 2 data rows
  })

  it('defeat_tagsが複数ある場合はセミコロン区切りで出力される', () => {
    const trade: Trade = {
      ...baseTrade,
      defeat_tags: ['損切り遅れ', 'IV読み違い'],
    }
    const csv = generateCsv([trade])
    const lines = csv.replace('\uFEFF', '').split('\r\n')
    expect(lines[1]).toContain('損切り遅れ;IV読み違い')
  })
})
