'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/',
    label: 'マーケット',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#00d4aa' : '#666'} strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    href: '/trades',
    label: '履歴',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#00d4aa' : '#666'} strokeWidth={1.5}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    href: '/trades/new',
    label: '記録',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#00d4aa' : '#666'} strokeWidth={2}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: '分析',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#00d4aa' : '#666'} strokeWidth={1.5}>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 2 5-6" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'メニュー',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke={active ? '#00d4aa' : '#666'} strokeWidth={1.5}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  // Don't show on auth pages
  if (pathname.startsWith('/auth')) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0a0a0a] border-t border-[#1e1e1e]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) && !(item.href === '/trades' && pathname === '/trades/new')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[60px] transition-colors ${
                isActive ? 'text-[#00d4aa]' : 'text-[#666]'
              }`}
            >
              {item.icon(isActive)}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
