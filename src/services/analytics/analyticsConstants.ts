// Shared analytics constants and utilities.
// Home for scale maps, thresholds, and ISO week helpers reused across analyzers.

export const HIGH_RATING_THRESHOLD = 7;

export const SWEETNESS_SCALE: Record<string, number> = {
  bone_dry: 1,
  dry: 2,
  off_dry: 3,
  medium: 4,
  sweet: 5,
};

export const CARBONATION_SCALE: Record<string, number> = {
  still: 1,
  lightly_sparkling: 2,
  sparkling: 3,
  highly_carbonated: 4,
};

// Higher value = clearer.
export const CLARITY_SCALE: Record<string, number> = {
  crystal_clear: 5,
  clear: 4,
  hazy: 3,
  cloudy: 2,
  opaque: 1,
};

const MS_PER_DAY = 86400000;

export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}

// The ISO week year can differ from the calendar year at Dec/Jan boundaries.
export function getIsoWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

export function getIsoWeekKey(date: Date): string {
  const week = getIsoWeekNumber(date);
  const year = getIsoWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Monday of the ISO week identified by "YYYY-Www".
export function getMondayFromIsoWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) {
    throw new Error(`Invalid ISO week key: ${key}`);
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // ISO week 1 contains the Thursday of the first calendar week.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}
