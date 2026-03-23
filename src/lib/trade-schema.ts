import { z } from "zod";

export const tradeTypeSchema = z.enum(["call", "put"]);
export const tradeStatusSchema = z.enum(["open", "closed"]);

export type TradeType = z.infer<typeof tradeTypeSchema>;
export type TradeStatus = z.infer<typeof tradeStatusSchema>;

/**
 * Type guard for TradeType values.
 */
export function isTradeType(value: unknown): value is TradeType {
  return tradeTypeSchema.safeParse(value).success;
}

/**
 * Type guard for TradeStatus values.
 */
export function isTradeStatus(value: unknown): value is TradeStatus {
  return tradeStatusSchema.safeParse(value).success;
}

/**
 * Schema for creating a new trade (server action input).
 */
export const createTradeSchema = z.object({
  trade_date: z.string().min(1, "取引日は必須です"),
  trade_type: tradeTypeSchema,
  strike_price: z.number().positive("権利行使価格は正の数を指定してください"),
  expiry_date: z.string().min(1, "限月（SQ日）は必須です"),
  quantity: z
    .number()
    .int("枚数は整数を指定してください")
    .min(1, "枚数は1以上を指定してください"),
  entry_price: z.number().min(0, "購入価格は0以上を指定してください"),
  exit_price: z.number().nullable(),
  exit_date: z.string().nullable(),
  iv_at_entry: z.number().nullable(),
  memo: z.string().nullable(),
  entry_delta: z.number().nullable(),
  entry_gamma: z.number().nullable(),
  entry_theta: z.number().nullable(),
  entry_vega: z.number().nullable(),
  defeat_tags: z.array(z.string()).nullable(),
  market_env_tags: z.array(z.string()).nullable(),
  is_mini: z.boolean().default(false),
  playbook_id: z.string().nullable().default(null),
  playbook_compliance: z.boolean().nullable().default(null),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

/**
 * Schema for updating an existing trade.
 */
export const updateTradeSchema = z.object({
  trade_date: z.string().min(1, "取引日は必須です"),
  trade_type: tradeTypeSchema,
  strike_price: z.number().positive("権利行使価格は正の数を指定してください"),
  expiry_date: z.string().min(1, "限月（SQ日）は必須です"),
  quantity: z
    .number()
    .int("枚数は整数を指定してください")
    .min(1, "枚数は1以上を指定してください"),
  entry_price: z.number().min(0, "購入価格は0以上を指定してください"),
  exit_price: z.number().nullable(),
  exit_date: z.string().nullable(),
  iv_at_entry: z.number().nullable(),
  memo: z.string().nullable(),
  is_mini: z.boolean().default(false),
  playbook_id: z.string().nullable().default(null),
  playbook_compliance: z.boolean().nullable().default(null),
});

export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

/**
 * Schema for a full Trade row (from DB).
 * Replaces `as Trade` type assertions.
 */
export const tradeSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  trade_date: z.string(),
  trade_type: tradeTypeSchema,
  strike_price: z.number(),
  expiry_date: z.string(),
  quantity: z.number(),
  entry_price: z.number(),
  exit_price: z.number().nullable(),
  exit_date: z.string().nullable(),
  pnl: z.number().nullable(),
  iv_at_entry: z.number().nullable(),
  memo: z.string().nullable(),
  status: tradeStatusSchema,
  defeat_tags: z.array(z.string()).nullable(),
  market_env_tags: z.array(z.string()).nullable(),
  entry_delta: z.number().nullable(),
  entry_gamma: z.number().nullable(),
  entry_theta: z.number().nullable(),
  entry_vega: z.number().nullable(),
  entry_iv_rank: z.number().nullable(),
  entry_iv_hv_ratio: z.number().nullable(),
  is_mini: z.boolean(),
  playbook_id: z.string().nullable(),
  playbook_compliance: z.boolean().nullable(),
});

export type Trade = z.infer<typeof tradeSchema>;

/**
 * Parse an array of trade rows from Supabase.
 * Throws ZodError if data doesn't match the schema.
 */
export function parseTrades(data: unknown[]): Trade[] {
  return data.map((row) => tradeSchema.parse(row));
}

/**
 * Parse a single trade row from Supabase.
 */
export function parseTrade(data: unknown): Trade {
  return tradeSchema.parse(data);
}

/**
 * Extract first error message from a ZodError for user-facing display.
 */
export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "入力データが不正です";
}
