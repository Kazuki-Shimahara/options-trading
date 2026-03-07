import Link from 'next/link'

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-blue-400 text-lg">◈</span>
          <span className="text-sm font-semibold text-slate-100 tracking-wide">NK225 Options</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/trades"
            className="px-3 py-1.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            履歴
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-1.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            分析
          </Link>
          <Link
            href="/trades/new"
            className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            + 記録
          </Link>
        </nav>
      </div>
    </header>
  )
}
