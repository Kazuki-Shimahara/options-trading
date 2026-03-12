import { DEFAULT_MULTIPLIER } from './constants'

export function calculatePnl(
  exitPrice: number | null | undefined,
  entryPrice: number,
  quantity: number,
  multiplier: number = DEFAULT_MULTIPLIER
): number | null {
  if (exitPrice == null) return null
  return (exitPrice - entryPrice) * quantity * multiplier
}
