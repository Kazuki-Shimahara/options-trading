// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DatePicker } from '../DatePicker'

afterEach(() => {
  cleanup()
})

describe('DatePicker', () => {
  it('renders with label and placeholder', () => {
    render(
      <DatePicker
        label="取引日"
        value=""
        onChange={() => {}}
        placeholder="日付を選択"
      />
    )
    expect(screen.getByText('取引日')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('日付を選択')).toBeInTheDocument()
  })

  it('displays formatted date when value is set', () => {
    render(
      <DatePicker
        label="取引日"
        value="2026-03-15"
        onChange={() => {}}
      />
    )
    expect(screen.getByDisplayValue('2026/03/15')).toBeInTheDocument()
  })

  it('opens calendar popup when input is clicked', () => {
    render(
      <DatePicker
        label="取引日"
        value="2026-03-15"
        onChange={() => {}}
      />
    )
    const input = screen.getByDisplayValue('2026/03/15')
    fireEvent.click(input)
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('calls onChange with date string when a day is selected', () => {
    const onChange = vi.fn()
    render(
      <DatePicker
        label="取引日"
        value="2026-03-15"
        onChange={onChange}
      />
    )
    const input = screen.getByDisplayValue('2026/03/15')
    fireEvent.click(input)
    // react-day-picker renders buttons inside gridcells
    const cell = screen.getByRole('gridcell', { name: '20' })
    const button = within(cell).getByRole('button')
    fireEvent.click(button)
    expect(onChange).toHaveBeenCalledWith('2026-03-20')
  })

  it('closes calendar after selecting a date', () => {
    const onChange = vi.fn()
    render(
      <DatePicker
        label="取引日"
        value="2026-03-15"
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByDisplayValue('2026/03/15'))
    const cell = screen.getByRole('gridcell', { name: '20' })
    const button = within(cell).getByRole('button')
    fireEvent.click(button)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('supports required prop', () => {
    render(
      <DatePicker
        label="限月"
        value=""
        onChange={() => {}}
        required
      />
    )
    const input = screen.getByPlaceholderText('日付を選択')
    expect(input).toBeRequired()
  })
})
