'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DatePickerProps {
  label: string
  value: string // 'YYYY-MM-DD' format
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = '日付を選択',
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = value
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined

  const displayValue = selectedDate
    ? format(selectedDate, 'yyyy/MM/dd')
    : ''

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] font-medium text-[#00d4aa]/80 mb-1 tracking-wider uppercase">
        {label}
      </label>
      <input
        type="text"
        readOnly
        required={required}
        value={displayValue}
        placeholder={placeholder}
        onClick={() => setOpen(!open)}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors cursor-pointer"
      />
      {open && (
        <div className="absolute z-50 mt-1 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-lg shadow-black/50 p-3">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate}
            locale={ja}
            classNames={{
              root: 'text-white text-sm',
              months: 'flex flex-col',
              month_caption: 'text-center text-[#00d4aa] font-semibold mb-2 text-sm',
              nav: 'flex justify-between items-center mb-2',
              button_previous: 'text-[#00d4aa] hover:text-[#00f4cc] p-1 transition-colors',
              button_next: 'text-[#00d4aa] hover:text-[#00f4cc] p-1 transition-colors',
              weekdays: 'grid grid-cols-7 text-center text-[10px] text-[#666] mb-1',
              weekday: 'py-1',
              weeks: '',
              week: 'grid grid-cols-7 text-center',
              day: 'p-0',
              day_button: 'w-9 h-9 rounded-lg text-sm hover:bg-[#1a1a1a] transition-colors text-[#ccc]',
              selected: '!bg-[#00d4aa] !text-black font-semibold rounded-lg',
              today: 'border border-[#00d4aa]/50 rounded-lg',
              outside: 'text-[#333]',
              disabled: 'text-[#333] cursor-not-allowed',
            }}
          />
        </div>
      )}
    </div>
  )
}
