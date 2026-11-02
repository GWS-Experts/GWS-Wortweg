"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DAILY_GOALS, dueWords, setDailyGoal, xpToday } from "@/lib/progress";
import type { LessonSummary, Level, Story } from "@/lib/types";
import { useProgress } from "./ProgressProvider";

const LEVEL_KEY = "gws-wortweg-level";

export function HomeView({ lessons, levels, story }: { lessons: LessonSummary[]; levels: Level[]; story: Story }) {
  const { progress, loaded, update } = useProgress();
  const [level, setLevel] = useState(levels[0].id);
  const xp = xpToday(progress);
  const goalPct = Math.min(100, Math.round((xp / progress.dailyGoal) * 100));
  const due = loaded ? dueWords(progress).length : 0;
  const learned = Object.keys(progress.words).length;
  const nextOverall = lessons.find((l) => !progress.lessons[l.id]);
  const levelLessons = lessons.filter((l) => l.level === level);
  const nextLesson = levelLessons.find((l) => !progress.lessons[l.id]);
  const levelTitle = levels.find((l) => l.id === level)?.title_en;

  // Open the level the learner chose last time, or the one they are working on.
  useEffect(() => {
    if (!loaded) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LEVEL_KEY);
    } catch {}
    const start = levels.some((l) => l.id === saved) ? saved! : (nextOverall?.level ?? levels[0].id);
    setLevel(start);
    // Only on first load; later the learner picks the level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const chooseLevel = (id: string) => {
    setLevel(id);
    try {
      localStorage.setItem(LEVEL_KEY, id);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand p-5 text-brand-ink">
        <p className="text-sm font-medium opacity-80">{story.title_de}</p>
        <h1 className="mt-1 text-2xl font-bold">{story.title_en}</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">{story.summary_en}</p>
        {loaded && nextLesson && (
          <Link
            href={`/lesson/${nextLesson.id}`}
            className="mt-4 inline-block rounded-xl bg-surface px-4 py-2.5 font-semibold text-brand shadow-sm"
          >
            {Object.keys(progress.lessons).length ? "Continue" : "Start"}: {nextLesson.title_de}
          </Link>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Daily goal</h2>
            <span className="text-sm text-muted">
              {xp} / {progress.dailyGoal} XP
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="mt-3 flex gap-1.5">
            {DAILY_GOALS.map((g) => (
              <button
                key={g}
                onClick={() => update((p) => setDailyGoal(p, g))}
                className={`rounded-lg px-2 py-1 text-xs font-medium ${
                  progress.dailyGoal === g ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand"
                }`}
              >
                {g} XP
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Word review</h2>
            <span className="text-sm text-muted">{learned} words learned</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {due > 0 ? `${due} words are due for review today.` : "Nothing due. New words come back after 1 day."}
          </p>
          {due > 0 && (
            <Link href="/review" className="mt-3 inline-block rounded-xl bg-warm px-3.5 py-2 text-sm font-semibold text-white">
              Review {due} words
            </Link>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 grid grid-cols-4 gap-1.5 rounded-2xl bg-surface p-1.5" role="tablist" aria-label="Level">
          {levels.map((lv) => {
            const all = lessons.filter((l) => l.level === lv.id);
            const done = all.filter((l) => progress.lessons[l.id]).length;
            const active = lv.id === level;
            return (
              <button
                key={lv.id}
                role="tab"
                aria-selected={active}
                onClick={() => chooseLevel(lv.id)}
                className={`rounded-xl px-2 py-2 text-center transition ${active ? "bg-brand text-brand-ink" : "hover:bg-brand-soft"}`}
              >
                <span className="block text-base font-bold">{lv.id}</span>
                <span className={`block text-xs ${active ? "opacity-80" : "text-muted"}`}>
                  {done}/{all.length}
                </span>
              </button>
            );
          })}
        </div>
        <h2 className="mb-3 text-lg font-bold">
          {level} · {levelTitle}
        </h2>
        <ol className="space-y-2.5">
          {levelLessons.map((l) => {
            const done = progress.lessons[l.id];
            const isNext = loaded && l.id === nextLesson?.id;
            return (
              <li key={l.id}>
                <Link
                  href={`/lesson/${l.id}`}
                  className={`flex items-center gap-4 rounded-2xl border bg-surface p-4 transition hover:border-brand ${
                    isNext ? "border-brand ring-2 ring-brand-soft" : "border-line"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                      done ? "bg-good text-white" : "bg-brand-soft text-brand"
                    }`}
                  >
                    {done ? "✓" : l.order}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.title_de}</span>
                    <span className="block text-sm text-muted">
                      {l.title_en} · {l.wordCount} words
                    </span>
                  </span>
                  {done && <span className="text-sm font-semibold text-good">{done.bestScore}%</span>}
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-center text-sm text-muted">More lessons are on the way.</p>
      </section>
    </div>
  );
}
