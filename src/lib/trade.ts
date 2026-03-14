import { DEFAULT_MULTIPLIER, MULTIPLIER_STANDARD, MULTIPLIER_MINI } from './constants'

export function calculatePnl(
  exitPrice: number | null | undefined,
  entryPrice: number,
  quantity: number,
  multiplier: number = DEFAULT_MULTIPLIER
): number | null {
  if (exitPrice == null) return null
  return (exitPrice - entryPrice) * quantity * multiplier
}

export function getMultiplier(isMini: boolean): number {
  return isMini ? MULTIPLIER_MINI : MULTIPLIER_STANDARD
}
