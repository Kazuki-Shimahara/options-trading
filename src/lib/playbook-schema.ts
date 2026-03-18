import { z } from "zod";

const playbookRuleCategorySchema = z.enum([
  "entry",
  "position_size",
  "stop_loss",
]);

const playbookRuleSchema = z.object({
  id: z.string().min(1),
  category: playbookRuleCategorySchema,
  description: z.string().min(1, "ルールの説明は必須です"),
});

/**
 * Schema for creating a new playbook.
 */
export const createPlaybookSchema = z.object({
  name: z.string().min(1, "Playbook名は必須です"),
  rules: z
    .array(playbookRuleSchema)
    .min(1, "ルールを1つ以上追加してください"),
});

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;

/**
 * Schema for updating a playbook.
 */
export const updatePlaybookSchema = z.object({
  name: z.string().min(1, "Playbook名は必須です"),
  rules: z
    .array(playbookRuleSchema)
    .min(1, "ルールを1つ以上追加してください"),
});

export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;

/**
 * Schema for a full Playbook row from DB.
 */
export const playbookSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  rules: z.array(playbookRuleSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Playbook = z.infer<typeof playbookSchema>;

/**
 * Parse a single playbook row from Supabase.
 */
export function parsePlaybook(data: unknown): Playbook {
  return playbookSchema.parse(data);
}

/**
 * Parse an array of playbook rows.
 */
export function parsePlaybooks(data: unknown[]): Playbook[] {
  return data.map((row) => playbookSchema.parse(row));
}
