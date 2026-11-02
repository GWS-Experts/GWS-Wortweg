import type { ReviewWord } from "./types";

/** Days until the next review, per box. Box 0 = just learned or answered wrongly. */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

export const XP_PER_CORRECT = 2;
export const XP_LESSON_BONUS = 10;
export const XP_PER_REVIEW = 1;
export const DAILY_GOALS = [20, 30, 50, 80];

export type WordState = ReviewWord & { box: number; due: string; seenAt: string };

export type Progress = {
  version: 1;
  xp: number;
  dailyGoal: number;
  daily: { date: string; xp: number };
  streak: { count: number; lastDate: string | null };
  lessons: Record<string, { bestScore: number; completedAt: string }>;
  words: Record<string, WordState>;
  updatedAt: string;
};

export function today(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return today(new Date(y, m - 1, d + days));
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    dailyGoal: 30,
    daily: { date: today(), xp: 0 },
    streak: { count: 0, lastDate: null },
    lessons: {},
    words: {},
    updatedAt: new Date(0).toISOString(),
  };
}

/** Adds XP for today and keeps the streak up to date. */
export function addXp(p: Progress, amount: number, date = today()): Progress {
  const daily = p.daily.date === date ? { date, xp: p.daily.xp + amount } : { date, xp: amount };
  let streak = p.streak;
  if (streak.lastDate !== date) {
    const continues = streak.lastDate === addDays(date, -1);
    streak = { count: continues ? streak.count + 1 : 1, lastDate: date };
  }
  return { ...p, xp: p.xp + amount, daily, streak, updatedAt: new Date().toISOString() };
}

/** The streak as it should be shown today: it breaks if yesterday was missed. */
export function currentStreak(p: Progress, date = today()): number {
  const { lastDate, count } = p.streak;
  return lastDate === date || lastDate === addDays(date, -1) ? count : 0;
}

export function xpToday(p: Progress, date = today()): number {
  return p.daily.date === date ? p.daily.xp : 0;
}

export function completeLesson(
  p: Progress,
  lessonId: string,
  score: number,
  words: ReviewWord[],
  date = today(),
): Progress {
  const prev = p.lessons[lessonId];
  const now = new Date().toISOString();
  const newWords = { ...p.words };
  for (const w of words) {
    if (!newWords[w.id]) newWords[w.id] = { ...w, box: 0, due: addDays(date, REVIEW_INTERVALS[0]), seenAt: now };
  }
  return {
    ...p,
    lessons: {
      ...p.lessons,
      [lessonId]: { bestScore: Math.max(prev?.bestScore ?? 0, score), completedAt: prev?.completedAt ?? now },
    },
    words: newWords,
    updatedAt: now,
  };
}

export function dueWords(p: Progress, date = today()): WordState[] {
  return Object.values(p.words)
    .filter((w) => w.due <= date)
    .sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box);
}

/** Moves a word up a box when known, back to box 0 when not. */
export function reviewWord(p: Progress, wordId: string, known: boolean, date = today()): Progress {
  const w = p.words[wordId];
  if (!w) return p;
  const box = known ? Math.min(w.box + 1, REVIEW_INTERVALS.length - 1) : 0;
  const now = new Date().toISOString();
  return {
    ...p,
    words: { ...p.words, [wordId]: { ...w, box, due: addDays(date, REVIEW_INTERVALS[box]), seenAt: now } },
    updatedAt: now,
  };
}

export function setDailyGoal(p: Progress, goal: number): Progress {
  return { ...p, dailyGoal: goal, updatedAt: new Date().toISOString() };
}

/** Combines progress from two devices without losing anything. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const lessons = { ...a.lessons };
  for (const [id, l] of Object.entries(b.lessons)) {
    const mine = lessons[id];
    lessons[id] = mine
      ? {
          bestScore: Math.max(mine.bestScore, l.bestScore),
          completedAt: mine.completedAt < l.completedAt ? mine.completedAt : l.completedAt,
        }
      : l;
  }
  const words = { ...a.words };
  for (const [id, w] of Object.entries(b.words)) {
    if (!words[id] || words[id].seenAt < w.seenAt) words[id] = w;
  }
  const daily =
    a.daily.date === b.daily.date
      ? { date: a.daily.date, xp: Math.max(a.daily.xp, b.daily.xp) }
      : a.daily.date > b.daily.date
        ? a.daily
        : b.daily;
  const sa = a.streak.lastDate ?? "";
  const sb = b.streak.lastDate ?? "";
  const streak =
    sa === sb ? { lastDate: a.streak.lastDate, count: Math.max(a.streak.count, b.streak.count) } : sa > sb ? a.streak : b.streak;
  return {
    version: 1,
    xp: Math.max(a.xp, b.xp),
    dailyGoal: newer.dailyGoal,
    daily,
    streak,
    lessons,
    words,
    updatedAt: newer.updatedAt,
  };
}

/** Accepts any stored value and returns valid progress. */
export function parseProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Progress>;
  return {
    ...base,
    ...r,
    version: 1,
    daily: r.daily ?? base.daily,
    streak: r.streak ?? base.streak,
    lessons: r.lessons ?? {},
    words: r.words ?? {},
  };
}
