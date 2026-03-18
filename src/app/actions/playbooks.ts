"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createPlaybookSchema,
  updatePlaybookSchema,
} from "@/lib/playbook-schema";

export type PlaybookActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createPlaybook(
  input: unknown,
): Promise<PlaybookActionResult> {
  const parsed = createPlaybookSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "入力データが不正です",
    };
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

  const { data: row, error } = await supabase
    .from("playbooks")
    .insert({
      name: data.name,
      rules: data.rules,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/playbooks");
  return { success: true, id: row.id };
}

export async function updatePlaybook(
  id: string,
  input: unknown,
): Promise<PlaybookActionResult> {
  if (!id) {
    return { success: false, error: "Playbook IDが指定されていません" };
  }

  const parsed = updatePlaybookSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "入力データが不正です",
    };
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

  const { error } = await supabase
    .from("playbooks")
    .update({
      name: data.name,
      rules: data.rules,
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${id}`);
  return { success: true };
}

export async function deletePlaybook(
  id: string,
): Promise<PlaybookActionResult> {
  if (!id) {
    return { success: false, error: "Playbook IDが指定されていません" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase.from("playbooks").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/playbooks");
  return { success: true };
}
