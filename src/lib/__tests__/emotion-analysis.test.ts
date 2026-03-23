import { describe, it, expect } from "vitest";
import {
  aggregateByEmotion,
  aggregateByConfidence,
  buildConfidenceScatter,
  compareEmotionWinRates,
  EMOTIONS,
  type TradeWithEmotion,
} from "@/lib/emotion-analysis";

function makeTrade(
  overrides: Partial<TradeWithEmotion>,
): TradeWithEmotion {
  return {
    id: "test-id",
    user_id: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    trade_date: "2024-01-01",
    trade_type: "call",
    strike_price: 39000,
    expiry_date: "2024-02-09",
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: "2024-01-15",
    pnl: 50000,
    iv_at_entry: 20,
    memo: null,
    status: "closed",
    defeat_tags: null,
    market_env_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: null,
    entry_iv_hv_ratio: null,
    is_mini: false,
    playbook_id: null,
    playbook_compliance: null,
    confidence_level: null,
    emotion: null,
    ...overrides,
  };
}

describe("EMOTIONS", () => {
  it("should contain the 5 defined emotions", () => {
    expect(EMOTIONS).toEqual(["冷静", "焦り", "興奮", "不安", "楽観"]);
  });
});

describe("aggregateByEmotion", () => {
  it("should return stats for all emotions even with no data", () => {
    const result = aggregateByEmotion([]);
    expect(result).toHaveLength(5);
    result.forEach((stat) => {
      expect(stat.total).toBe(0);
      expect(stat.winRate).toBe(0);
      expect(stat.avgPnl).toBe(0);
    });
  });

  it("should calculate win rate and avg PnL per emotion", () => {
    const trades: TradeWithEmotion[] = [
      makeTrade({ emotion: "冷静", pnl: 50000 }),
      makeTrade({ emotion: "冷静", pnl: 30000 }),
      makeTrade({ emotion: "冷静", pnl: -10000 }),
      makeTrade({ emotion: "焦り", pnl: -20000 }),
      makeTrade({ emotion: "焦り", pnl: -30000 }),
      makeTrade({ emotion: "焦り", pnl: 10000 }),
    ];

    const result = aggregateByEmotion(trades);

    const calm = result.find((s) => s.emotion === "冷静")!;
    expect(calm.total).toBe(3);
    expect(calm.wins).toBe(2);
    expect(calm.losses).toBe(1);
    expect(calm.winRate).toBeCloseTo(66.67, 1);
    expect(calm.avgPnl).toBeCloseTo(23333.33, 0);

    const rush = result.find((s) => s.emotion === "焦り")!;
    expect(rush.total).toBe(3);
    expect(rush.wins).toBe(1);
    expect(rush.losses).toBe(2);
    expect(rush.winRate).toBeCloseTo(33.33, 1);
    expect(rush.avgPnl).toBeCloseTo(-13333.33, 0);
  });

  it("should ignore trades without pnl", () => {
    const trades: TradeWithEmotion[] = [
      makeTrade({ emotion: "冷静", pnl: null }),
      makeTrade({ emotion: "冷静", pnl: 50000 }),
    ];

    const result = aggregateByEmotion(trades);
    const calm = result.find((s) => s.emotion === "冷静")!;
    expect(calm.total).toBe(1);
  });
});

describe("aggregateByConfidence", () => {
  it("should return stats for confidence levels 1-5", () => {
    const result = aggregateByConfidence([]);
    expect(result).toHaveLength(5);
    expect(result.map((s) => s.confidence)).toEqual([1, 2, 3, 4, 5]);
  });

  it("should calculate stats per confidence level", () => {
    const trades: TradeWithEmotion[] = [
      makeTrade({ confidence_level: 5, pnl: 100000 }),
      makeTrade({ confidence_level: 5, pnl: 80000 }),
      makeTrade({ confidence_level: 1, pnl: -50000 }),
      makeTrade({ confidence_level: 1, pnl: -30000 }),
    ];

    const result = aggregateByConfidence(trades);

    const high = result.find((s) => s.confidence === 5)!;
    expect(high.total).toBe(2);
    expect(high.winRate).toBe(100);
    expect(high.avgPnl).toBe(90000);

    const low = result.find((s) => s.confidence === 1)!;
    expect(low.total).toBe(2);
    expect(low.winRate).toBe(0);
    expect(low.avgPnl).toBe(-40000);
  });
});

describe("buildConfidenceScatter", () => {
  it("should return points for trades with confidence and pnl", () => {
    const trades: TradeWithEmotion[] = [
      makeTrade({ confidence_level: 3, pnl: 50000 }),
      makeTrade({ confidence_level: null, pnl: 20000 }),
      makeTrade({ confidence_level: 4, pnl: null }),
      makeTrade({ confidence_level: 5, pnl: -10000 }),
    ];

    const result = buildConfidenceScatter(trades);
    expect(result).toEqual([
      { confidence: 3, pnl: 50000 },
      { confidence: 5, pnl: -10000 },
    ]);
  });

  it("should return empty array for no qualifying trades", () => {
    expect(buildConfidenceScatter([])).toEqual([]);
  });
});

describe("compareEmotionWinRates", () => {
  it("should compare win rates between two emotions", () => {
    const trades: TradeWithEmotion[] = [
      makeTrade({ emotion: "冷静", pnl: 50000 }),
      makeTrade({ emotion: "冷静", pnl: 30000 }),
      makeTrade({ emotion: "冷静", pnl: -10000 }),
      makeTrade({ emotion: "焦り", pnl: -20000 }),
      makeTrade({ emotion: "焦り", pnl: -30000 }),
      makeTrade({ emotion: "焦り", pnl: 10000 }),
    ];

    const stats = aggregateByEmotion(trades);
    const comparison = compareEmotionWinRates(stats, "冷静", "焦り");

    expect(comparison.emotionA.emotion).toBe("冷静");
    expect(comparison.emotionB.emotion).toBe("焦り");
    expect(comparison.diff).toBeCloseTo(33.33, 1);
  });
});
