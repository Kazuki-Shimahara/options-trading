export function calculatePnl(
  exitPrice: number | null | undefined,
  entryPrice: number,
  quantity: number
): number | null {
  if (exitPrice == null) return null
  return (exitPrice - entryPrice) * quantity * 1000
}
