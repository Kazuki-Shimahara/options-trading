/**
 * Playbook feature: trading rule definitions and compliance analysis.
 */

export type PlaybookRuleCategory = "entry" | "position_size" | "stop_loss";

export interface PlaybookRule {
  id: string;
  category: PlaybookRuleCategory;
  description: string;
}

export interface Playbook {
  id: string;
  user_id: string;
  name: string;
  rules: PlaybookRule[];
  created_at: string;
  updated_at: string;
}

export interface PlaybookComplianceTrade {
  playbook_compliance: boolean | null;
  defeat_tags: string[] | null;
  pnl: number | null;
}

/**
 * Calculate the compliance rate (%) for a set of trades.
 * Trades with null compliance are excluded from the calculation.
 */
export function calculateComplianceRate(
  trades: PlaybookComplianceTrade[]
): number {
  const evaluated = trades.filter((t) => t.playbook_compliance !== null);
  if (evaluated.length === 0) return 0;
  const compliant = evaluated.filter((t) => t.playbook_compliance === true);
  return (compliant.length / evaluated.length) * 100;
}

export interface ComplianceGroupStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
}

export interface PlaybookComplianceStats {
  compliant: ComplianceGroupStats;
  nonCompliant: ComplianceGroupStats;
}

function buildGroupStats(
  trades: PlaybookComplianceTrade[]
): ComplianceGroupStats {
  const withPnl = trades.filter((t) => t.pnl !== null);
  const wins = withPnl.filter((t) => t.pnl! >= 0).length;
  const losses = withPnl.filter((t) => t.pnl! < 0).length;
  const total = withPnl.length;
  const totalPnl = withPnl.reduce((sum, t) => sum + t.pnl!, 0);
  return {
    total,
    wins,
    losses,
    winRate: total > 0 ? (wins / total) * 100 : 0,
    totalPnl,
  };
}

/**
 * Calculate win rate and PnL stats grouped by compliant vs non-compliant trades.
 */
export function calculatePlaybookComplianceStats(
  trades: PlaybookComplianceTrade[]
): PlaybookComplianceStats {
  const compliantTrades = trades.filter(
    (t) => t.playbook_compliance === true
  );
  const nonCompliantTrades = trades.filter(
    (t) => t.playbook_compliance === false
  );

  return {
    compliant: buildGroupStats(compliantTrades),
    nonCompliant: buildGroupStats(nonCompliantTrades),
  };
}

export interface ViolationDefeatTagCross {
  defeatTag: string;
  violationCount: number;
  totalLoss: number;
}

/**
 * Cross-analyze rule violations with defeat tags.
 * Only considers trades where playbook_compliance is false.
 * Returns results sorted by violation count descending.
 */
export function crossAnalyzeViolationsAndDefeatTags(
  trades: PlaybookComplianceTrade[]
): ViolationDefeatTagCross[] {
  const violations = trades.filter(
    (t) => t.playbook_compliance === false && t.defeat_tags && t.defeat_tags.length > 0
  );

  const map = new Map<string, { count: number; totalLoss: number }>();

  for (const trade of violations) {
    for (const tag of trade.defeat_tags!) {
      const entry = map.get(tag) || { count: 0, totalLoss: 0 };
      entry.count += 1;
      entry.totalLoss += trade.pnl != null && trade.pnl < 0 ? trade.pnl : 0;
      map.set(tag, entry);
    }
  }

  return Array.from(map.entries())
    .map(([defeatTag, data]) => ({
      defeatTag,
      violationCount: data.count,
      totalLoss: data.totalLoss,
    }))
    .sort((a, b) => b.violationCount - a.violationCount);
}
