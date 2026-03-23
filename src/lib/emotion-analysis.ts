import type { Trade } from "@/lib/trade-schema";

export const EMOTIONS = [
  "冷静",
  "焦り",
  "興奮",
  "不安",
  "楽観",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export interface EmotionStats {
  emotion: Emotion;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
}

export interface ConfidenceStats {
  confidence: number;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
}

export interface ConfidencePoint {
  confidence: number;
  pnl: number;
}

export type TradeWithEmotion = Trade & {
  confidence_level: number | null;
  emotion: string | null;
};

/**
 * Aggregate win rate and average PnL per emotion.
 */
export function aggregateByEmotion(
  trades: TradeWithEmotion[],
): EmotionStats[] {
  return EMOTIONS.map((emotion) => {
    const matching = trades.filter(
      (t) => t.emotion === emotion && t.pnl != null,
    );
    const wins = matching.filter((t) => t.pnl! >= 0).length;
    const losses = matching.filter((t) => t.pnl! < 0).length;
    const total = matching.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgPnl =
      total > 0
        ? matching.reduce((sum, t) => sum + t.pnl!, 0) / total
        : 0;
    return { emotion, total, wins, losses, winRate, avgPnl };
  });
}

/**
 * Aggregate win rate and average PnL per confidence level (1-5).
 */
export function aggregateByConfidence(
  trades: TradeWithEmotion[],
): ConfidenceStats[] {
  return [1, 2, 3, 4, 5].map((confidence) => {
    const matching = trades.filter(
      (t) => t.confidence_level === confidence && t.pnl != null,
    );
    const wins = matching.filter((t) => t.pnl! >= 0).length;
    const losses = matching.filter((t) => t.pnl! < 0).length;
    const total = matching.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgPnl =
      total > 0
        ? matching.reduce((sum, t) => sum + t.pnl!, 0) / total
        : 0;
    return { confidence, total, wins, losses, winRate, avgPnl };
  });
}

/**
 * Build scatter plot data: confidence vs PnL.
 */
export function buildConfidenceScatter(
  trades: TradeWithEmotion[],
): ConfidencePoint[] {
  return trades
    .filter((t) => t.confidence_level != null && t.pnl != null)
    .map((t) => ({
      confidence: t.confidence_level!,
      pnl: t.pnl!,
    }));
}

/**
 * Compare win rates between two emotions.
 */
export function compareEmotionWinRates(
  stats: EmotionStats[],
  emotionA: Emotion,
  emotionB: Emotion,
): { emotionA: EmotionStats; emotionB: EmotionStats; diff: number } {
  const a = stats.find((s) => s.emotion === emotionA)!;
  const b = stats.find((s) => s.emotion === emotionB)!;
  return {
    emotionA: a,
    emotionB: b,
    diff: a.winRate - b.winRate,
  };
}
