import { describe, it, expect } from "vitest";
import {
  createPlaybookSchema,
  updatePlaybookSchema,
  parsePlaybook,
} from "../playbook-schema";

describe("createPlaybookSchema", () => {
  it("validates a valid playbook input", () => {
    const input = {
      name: "デルタニュートラル戦略",
      rules: [
        { id: "r1", category: "entry", description: "IV Rank 50以上" },
        { id: "r2", category: "position_size", description: "最大2枚まで" },
        { id: "r3", category: "stop_loss", description: "損失10万で損切り" },
      ],
    };

    const result = createPlaybookSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const input = {
      name: "",
      rules: [{ id: "r1", category: "entry", description: "test" }],
    };

    const result = createPlaybookSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty rules array", () => {
    const input = {
      name: "Test",
      rules: [],
    };

    const result = createPlaybookSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const input = {
      name: "Test",
      rules: [{ id: "r1", category: "invalid", description: "test" }],
    };

    const result = createPlaybookSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const input = {
      name: "Test",
      rules: [
        { id: "r1", category: "entry", description: "エントリー条件" },
        { id: "r2", category: "position_size", description: "ポジションサイズ" },
        { id: "r3", category: "stop_loss", description: "損切りルール" },
      ],
    };

    const result = createPlaybookSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("updatePlaybookSchema", () => {
  it("validates a valid update input", () => {
    const input = {
      name: "Updated Name",
      rules: [{ id: "r1", category: "entry", description: "Updated rule" }],
    };

    const result = updatePlaybookSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("parsePlaybook", () => {
  it("parses a valid playbook row", () => {
    const row = {
      id: "123",
      user_id: "user-1",
      name: "Test Playbook",
      rules: [{ id: "r1", category: "entry", description: "test" }],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const playbook = parsePlaybook(row);
    expect(playbook.name).toBe("Test Playbook");
    expect(playbook.rules).toHaveLength(1);
  });

  it("throws for invalid data", () => {
    expect(() => parsePlaybook({ id: "123" })).toThrow();
  });
});
