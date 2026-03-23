"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculatePnl, getMultiplier } from "@/lib/trade";
import {
  createTradeSchema,
  updateTradeSchema,
  getZodErrorMessage,
  parseTrade,
} from "@/lib/trade-schema";
import type { Trade } from "@/lib/trade-schema";

export type TradeActionResult =
  | { success: true }
  | { success: false; error: string };

export async function getTradeById(id: string): Promise<Trade | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }
  return parseTrade(data);
}

export async function createTrade(
  input: unknown,
): Promise<TradeActionResult> {
  const parsed = createTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: getZodErrorMessage(parsed.error) };
  }
  const data = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  const multiplier = getMultiplier(data.is_mini);
  const pnl = calculatePnl(data.exit_price, data.entry_price, data.quantity, multiplier);

  const { error } = await supabase.from("trades").insert({
    trade_date: data.trade_date,
    trade_type: data.trade_type,
    strike_price: data.strike_price,
    expiry_date: data.expiry_date,
    quantity: data.quantity,
    entry_price: data.entry_price,
    exit_price: data.exit_price,
    exit_date: data.exit_date,
    pnl,
    iv_at_entry: data.iv_at_entry,
    memo: data.memo,
    status: data.exit_price !== null ? "closed" : "open",
    defeat_tags: data.defeat_tags,
    market_env_tags: data.market_env_tags,
    user_id: user.id,
    entry_delta: data.entry_delta,
    entry_gamma: data.entry_gamma,
    entry_theta: data.entry_theta,
    entry_vega: data.entry_vega,
    is_mini: data.is_mini,
    playbook_id: data.playbook_id,
    playbook_compliance: data.playbook_compliance,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trades");
  return { success: true };
}

export async function updateTrade(
  id: string,
  input: unknown,
): Promise<TradeActionResult> {
  if (!id) {
    return { success: false, error: "取引IDが指定されていません" };
  }

  const parsed = updateTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: getZodErrorMessage(parsed.error) };
  }
  const data = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  const multiplier = getMultiplier(data.is_mini);
  const pnl = calculatePnl(data.exit_price, data.entry_price, data.quantity, multiplier);

  const { error } = await supabase
    .from("trades")
    .update({
      trade_date: data.trade_date,
      trade_type: data.trade_type,
      strike_price: data.strike_price,
      expiry_date: data.expiry_date,
      quantity: data.quantity,
      entry_price: data.entry_price,
      exit_price: data.exit_price,
      exit_date: data.exit_date,
      pnl,
      iv_at_entry: data.iv_at_entry,
      memo: data.memo,
      status: data.exit_price !== null ? "closed" : "open",
      is_mini: data.is_mini,
      playbook_id: data.playbook_id,
      playbook_compliance: data.playbook_compliance,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
  return { success: true };
}

export async function updateTradeReview(
  id: string,
  data: { defeat_tags: string[]; memo: string },
): Promise<TradeActionResult> {
  if (!id) {
    return { success: false, error: "取引IDが指定されていません" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("trades")
    .update({
      defeat_tags: data.defeat_tags,
      memo: data.memo,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
  revalidatePath("/review");
  return { success: true };
}

export async function deleteTrade(id: string): Promise<TradeActionResult> {
  if (!id) {
    return { success: false, error: "取引IDが指定されていません" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase.from("trades").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/trades");
  return { success: true };
}
