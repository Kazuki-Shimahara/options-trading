"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserPreference, TradingStyleValue } from "@/types/database";

export type SettingsActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function loadUserPreferences(): Promise<UserPreference | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }
  return data as UserPreference;
}

export async function saveUserPreferences(
  preferenceId: string | null,
  tradingStyle: TradingStyleValue,
): Promise<SettingsActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  if (preferenceId) {
    const { error } = await supabase
      .from("user_preferences")
      .update({ trading_style: tradingStyle })
      .eq("id", preferenceId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } else {
    const { data, error } = await supabase
      .from("user_preferences")
      .insert({ trading_style: tradingStyle, user_id: user.id })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: (data as UserPreference).id };
  }
}
