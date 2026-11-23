// Mirrors the backend GapAnalyzer, so the employee's own view agrees with what HR sees.
// Used on the employee side only: HR gets the result from GET api/projects/{id}/employees/{id}/gaps.

export const LEVELS = ['Beginner', 'Intermediate', 'Expert'];

export type GapState = 'Met' | 'BelowLevel' | 'Missing';

// Enums arrive as strings, but tolerate numbers too (some of your DTOs allow both)
export function levelName(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  return typeof v === 'number' ? (LEVELS[v] ?? String(v)) : v;
}

export function levelIndex(v: string | number | null | undefined): number {
  return LEVELS.indexOf(levelName(v));
}

export interface GapRequirement {
  skillId: number;
  skillName: string;
  isRequired: boolean;
  minimumLevel: string | number;
}

export interface HeldSkill {
  skillId: number;
  skillName: string;
  proficiencyLevel: string | number;
}

export interface GapRow {
  skillId: number;
  skillName: string;
  isRequired: boolean;
  requiredLevel: string;
  employeeLevel: string | null; // null when Missing
  status: GapState;
}

export interface GapSummary {
  rows: GapRow[];
  extras: { skillId: number; skillName: string; level: string }[];
  requiredTotal: number;
  requiredMet: number;
  niceTotal: number;
  niceMet: number;
  meetsAllRequired: boolean;
}

const RANK: Record<GapState, number> = { Missing: 2, BelowLevel: 1, Met: 0 };

export function computeGap(requirements: GapRequirement[], held: HeldSkill[]): GapSummary {
  // One entry per skill: keep the highest level
  const best = new Map<number, HeldSkill>();
  for (const h of held) {
    const cur = best.get(h.skillId);
    if (!cur || levelIndex(h.proficiencyLevel) > levelIndex(cur.proficiencyLevel)) best.set(h.skillId, h);
  }

  const rows: GapRow[] = requirements
    .map((r) => {
      const h = best.get(r.skillId);
      let status: GapState = 'Missing';
      if (h) status = levelIndex(h.proficiencyLevel) >= levelIndex(r.minimumLevel) ? 'Met' : 'BelowLevel';
      return {
        skillId: r.skillId,
        skillName: r.skillName,
        isRequired: r.isRequired,
        requiredLevel: levelName(r.minimumLevel),
        employeeLevel: h ? levelName(h.proficiencyLevel) : null,
        status,
      };
    })
    // Required first, then Missing, then Below level, then Met, then by name
    .sort(
      (a, b) =>
        Number(b.isRequired) - Number(a.isRequired) ||
        RANK[b.status] - RANK[a.status] ||
        a.skillName.localeCompare(b.skillName),
    );

  const requiredIds = new Set(requirements.map((r) => r.skillId));
  const extras = [...best.values()]
    .filter((h) => !requiredIds.has(h.skillId))
    .map((h) => ({ skillId: h.skillId, skillName: h.skillName, level: levelName(h.proficiencyLevel) }))
    .sort((a, b) => a.skillName.localeCompare(b.skillName));

  const req = rows.filter((r) => r.isRequired);
  const nice = rows.filter((r) => !r.isRequired);
  return {
    rows,
    extras,
    requiredTotal: req.length,
    requiredMet: req.filter((r) => r.status === 'Met').length,
    niceTotal: nice.length,
    niceMet: nice.filter((r) => r.status === 'Met').length,
    meetsAllRequired: req.every((r) => r.status === 'Met'),
  };
}