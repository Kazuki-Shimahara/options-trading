import { describe, it, expect } from "vitest";
import {
  createTradeSchema,
  updateTradeSchema,
  tradeSchema,
} from "@/lib/trade-schema";

describe("createTradeSchema", () => {
  const validInput = {
    trade_date: "2025-01-15",
    trade_type: "call" as const,
    strike_price: 39000,
    expiry_date: "2025-02-14",
    quantity: 1,
    entry_price: 150.5,
    exit_price: null,
    exit_date: null,
    iv_at_entry: null,
    memo: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    defeat_tags: null,
    market_env_tags: null,
  };

  it("should accept valid input", () => {
    const result = createTradeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should accept valid input with optional fields filled", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      exit_price: 200,
      exit_date: "2025-02-10",
      iv_at_entry: 18.5,
      memo: "テストメモ",
      entry_delta: 0.45,
      entry_gamma: 0.001,
      entry_theta: -5.2,
      entry_vega: 12.3,
      defeat_tags: ["損切り遅れ"],
      market_env_tags: ["上昇トレンド"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing trade_date", () => {
    const { trade_date: _, ...input } = validInput;
    const result = createTradeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject invalid trade_type", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      trade_type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject strike_price <= 0", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      strike_price: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative strike_price", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      strike_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("should reject quantity < 1", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative entry_price", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      entry_price: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept entry_price of 0", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      entry_price: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer quantity", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty string for trade_date", () => {
    const result = createTradeSchema.safeParse({
      ...validInput,
      trade_date: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTradeSchema", () => {
  const validInput = {
    trade_date: "2025-01-15",
    trade_type: "put" as const,
    strike_price: 38000,
    expiry_date: "2025-02-14",
    quantity: 2,
    entry_price: 200,
    exit_price: 100,
    exit_date: "2025-02-10",
    iv_at_entry: 20.5,
    memo: "更新テスト",
  };

  it("should accept valid update input", () => {
    const result = updateTradeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject invalid trade_type", () => {
    const result = updateTradeSchema.safeParse({
      ...validInput,
      trade_type: "spread",
    });
    expect(result.success).toBe(false);
  });
});

describe("tradeSchema (full Trade row)", () => {
  const validTrade = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: "user-123",
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
    trade_date: "2025-01-15",
    trade_type: "call",
    strike_price: 39000,
    expiry_date: "2025-02-14",
    quantity: 1,
    entry_price: 150.5,
    exit_price: null,
    exit_date: null,
    pnl: null,
    iv_at_entry: null,
    memo: null,
    status: "open",
    defeat_tags: null,
    market_env_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: null,
    entry_iv_hv_ratio: null,
  };

  it("should parse a valid Trade row", () => {
    const result = tradeSchema.safeParse(validTrade);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", () => {
    const result = tradeSchema.safeParse({
      ...validTrade,
      status: "pending",
    });
    expect(result.success).toBe(false);
  });
});
