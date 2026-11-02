"use client";

import Link from "next/link";
import { currentStreak, xpToday } from "@/lib/progress";
import { accountsEnabled } from "@/lib/supabase";
import { useProgress } from "./ProgressProvider";

export function Header() {
  const { progress, loaded, user } = useProgress();
  const streak = loaded ? currentStreak(progress) : 0;
  const xp = loaded ? xpToday(progress) : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG */}
          <img src="/icon.svg" alt="" width={28} height={28} />
          <span>
            GWS-<span className="text-brand">Wortweg</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 whitespace-nowrap text-sm sm:gap-3">
          <span title="Day streak" className="rounded-full bg-warm-soft px-2.5 py-1 font-semibold text-warm">
            🔥 {streak}
          </span>
          <span title="XP today" className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand">
            {xp}/{progress.dailyGoal} XP
          </span>
          {accountsEnabled && (
            <Link href="/account" className="text-muted hover:text-ink">
              {user ? "Account" : "Sign in"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
