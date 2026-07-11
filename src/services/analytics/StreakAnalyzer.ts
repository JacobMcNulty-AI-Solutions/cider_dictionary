// Feature 5: Drinking Streaks.
// Longest streak of consecutive ISO calendar weeks with at least one logged
// experience, plus the current active streak.

import { ExperienceLog } from '../../types/experience';
import { getIsoWeekKey, getMondayFromIsoWeekKey } from './analyticsConstants';

export interface StreakResult {
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  lastLoggedDate: Date | null;
}

const MS_PER_DAY = 86400000;

export class StreakAnalyzer {
  private static instance: StreakAnalyzer;

  public static getInstance(): StreakAnalyzer {
    if (!StreakAnalyzer.instance) {
      StreakAnalyzer.instance = new StreakAnalyzer();
    }
    return StreakAnalyzer.instance;
  }

  public computeStreaks(experiences: ExperienceLog[]): StreakResult {
    if (experiences.length === 0) {
      return { currentStreakWeeks: 0, longestStreakWeeks: 0, lastLoggedDate: null };
    }

    const validDates: Date[] = [];
    for (const exp of experiences) {
      const d = new Date(exp.date);
      if (!isNaN(d.getTime())) validDates.push(d);
    }

    if (validDates.length === 0) {
      return { currentStreakWeeks: 0, longestStreakWeeks: 0, lastLoggedDate: null };
    }

    const weekKeys = new Set<string>();
    for (const d of validDates) weekKeys.add(getIsoWeekKey(d));

    const sortedKeys = Array.from(weekKeys).sort();
    const sortedMondays = sortedKeys.map(k => getMondayFromIsoWeekKey(k));

    let longestStreak = 1;
    let runningStreak = 1;
    for (let i = 1; i < sortedMondays.length; i++) {
      const prev = sortedMondays[i - 1];
      const curr = sortedMondays[i];
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / MS_PER_DAY);
      if (diffDays === 7) {
        runningStreak++;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 1;
      }
    }

    // The trailing streak from the end of `sortedKeys` is the "current" streak
    // only if it extends to this or last calendar week.
    let currentStreak = runningStreak;
    const now = new Date();
    const todayKey = getIsoWeekKey(now);
    const lastWeekKey = getIsoWeekKey(new Date(now.getTime() - 7 * MS_PER_DAY));
    const mostRecentKey = sortedKeys[sortedKeys.length - 1];
    if (mostRecentKey !== todayKey && mostRecentKey !== lastWeekKey) {
      currentStreak = 0;
    }

    let lastLoggedDate = validDates[0];
    for (const d of validDates) if (d > lastLoggedDate) lastLoggedDate = d;

    return {
      currentStreakWeeks: currentStreak,
      longestStreakWeeks: longestStreak,
      lastLoggedDate,
    };
  }
}

export const streakAnalyzer = StreakAnalyzer.getInstance();
export default StreakAnalyzer;
