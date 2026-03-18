import { describe, it, expect } from "vitest";
import {
  calculateComplianceRate,
  calculatePlaybookComplianceStats,
  crossAnalyzeViolationsAndDefeatTags,
  type PlaybookRule,
  type PlaybookComplianceTrade,
} from "../playbook";

describe("calculateComplianceRate", () => {
  it("returns 0 when no trades", () => {
    expect(calculateComplianceRate([])).toBe(0);
  });

  it("returns 100 when all trades are compliant", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: true, defeat_tags: null, pnl: null },
      { playbook_compliance: true, defeat_tags: null, pnl: null },
    ];
    expect(calculateComplianceRate(trades)).toBe(100);
  });

  it("returns 0 when no trades are compliant", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: false, defeat_tags: null, pnl: null },
      { playbook_compliance: false, defeat_tags: null, pnl: null },
    ];
    expect(calculateComplianceRate(trades)).toBe(0);
  });

  it("calculates correct percentage for mixed compliance", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: true, defeat_tags: null, pnl: null },
      { playbook_compliance: false, defeat_tags: null, pnl: null },
      { playbook_compliance: true, defeat_tags: null, pnl: null },
      { playbook_compliance: true, defeat_tags: null, pnl: null },
    ];
    expect(calculateComplianceRate(trades)).toBe(75);
  });

  it("excludes trades with null compliance", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: true, defeat_tags: null, pnl: null },
      { playbook_compliance: null, defeat_tags: null, pnl: null },
      { playbook_compliance: false, defeat_tags: null, pnl: null },
    ];
    expect(calculateComplianceRate(trades)).toBe(50);
  });
});

describe("calculatePlaybookComplianceStats", () => {
  it("returns stats with win rates for compliant vs non-compliant trades", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: true, defeat_tags: null, pnl: 1000 },
      { playbook_compliance: true, defeat_tags: null, pnl: -500 },
      { playbook_compliance: true, defeat_tags: null, pnl: 2000 },
      { playbook_compliance: false, defeat_tags: null, pnl: -1000 },
      { playbook_compliance: false, defeat_tags: null, pnl: -200 },
      { playbook_compliance: false, defeat_tags: null, pnl: 300 },
    ];

    const stats = calculatePlaybookComplianceStats(trades);

    expect(stats.compliant.total).toBe(3);
    expect(stats.compliant.wins).toBe(2);
    expect(stats.compliant.losses).toBe(1);
    expect(stats.compliant.winRate).toBeCloseTo(66.67, 1);
    expect(stats.compliant.totalPnl).toBe(2500);

    expect(stats.nonCompliant.total).toBe(3);
    expect(stats.nonCompliant.wins).toBe(1);
    expect(stats.nonCompliant.losses).toBe(2);
    expect(stats.nonCompliant.winRate).toBeCloseTo(33.33, 1);
    expect(stats.nonCompliant.totalPnl).toBe(-900);
  });

  it("handles empty trades", () => {
    const stats = calculatePlaybookComplianceStats([]);
    expect(stats.compliant.total).toBe(0);
    expect(stats.compliant.winRate).toBe(0);
    expect(stats.nonCompliant.total).toBe(0);
    expect(stats.nonCompliant.winRate).toBe(0);
  });
});

describe("crossAnalyzeViolationsAndDefeatTags", () => {
  it("counts violations per defeat tag", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: false, defeat_tags: ["損切り遅れ", "ポジションサイズ過大"], pnl: -1000 },
      { playbook_compliance: false, defeat_tags: ["損切り遅れ"], pnl: -500 },
      { playbook_compliance: true, defeat_tags: ["損切り遅れ"], pnl: -200 },
      { playbook_compliance: false, defeat_tags: ["IV高値掴み"], pnl: -300 },
    ];

    const result = crossAnalyzeViolationsAndDefeatTags(trades);

    const losscut = result.find((r) => r.defeatTag === "損切り遅れ");
    expect(losscut).toBeDefined();
    expect(losscut!.violationCount).toBe(2);
    expect(losscut!.totalLoss).toBe(-1500);

    const posSize = result.find((r) => r.defeatTag === "ポジションサイズ過大");
    expect(posSize).toBeDefined();
    expect(posSize!.violationCount).toBe(1);
    expect(posSize!.totalLoss).toBe(-1000);

    const iv = result.find((r) => r.defeatTag === "IV高値掴み");
    expect(iv).toBeDefined();
    expect(iv!.violationCount).toBe(1);
    expect(iv!.totalLoss).toBe(-300);
  });

  it("returns sorted by violation count descending", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: false, defeat_tags: ["損切り遅れ"], pnl: -100 },
      { playbook_compliance: false, defeat_tags: ["損切り遅れ"], pnl: -200 },
      { playbook_compliance: false, defeat_tags: ["IV高値掴み"], pnl: -50 },
    ];

    const result = crossAnalyzeViolationsAndDefeatTags(trades);
    expect(result[0].defeatTag).toBe("損切り遅れ");
    expect(result[0].violationCount).toBe(2);
  });

  it("returns empty for no violations", () => {
    const trades: PlaybookComplianceTrade[] = [
      { playbook_compliance: true, defeat_tags: ["損切り遅れ"], pnl: -100 },
    ];

    const result = crossAnalyzeViolationsAndDefeatTags(trades);
    expect(result.length).toBe(0);
  });
});

describe("PlaybookRule type", () => {
  it("accepts valid playbook rules", () => {
    const rule: PlaybookRule = {
      id: "entry-1",
      category: "entry",
      description: "IV Rank 50以上の時のみエントリー",
    };
    expect(rule.category).toBe("entry");
  });
});
