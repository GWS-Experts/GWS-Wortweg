"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProgress } from "@/components/ProgressProvider";
import { SpeakButton } from "@/components/SpeakButton";
import { addXp, dueWords, reviewWord, XP_PER_REVIEW, type WordState } from "@/lib/progress";

export default function ReviewPage() {
  const { progress, loaded, update } = useProgress();
  // Fix the list when the session starts so answered words don't jump around.
  const [session, setSession] = useState<WordState[] | null>(null);
  const due = useMemo(() => (loaded ? dueWords(progress).slice(0, 20) : []), [loaded, progress]);
  const words = session ?? due;
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);

  if (!loaded) return null;

  if (!words.length || i >= words.length) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-6xl">{i > 0 ? "🎉" : "✅"}</div>
        <h1 className="text-2xl font-bold">{i > 0 ? "Review done!" : "Nothing to review"}</h1>
        <p className="text-muted">
          {i > 0
            ? `You knew ${known} of ${i} words. The words come back at the right time.`
            : "Words from your lessons come back here after 1, 3, 7, 14 and 30 days."}
        </p>
        <Link href="/" className="inline-block rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink">
          Back to overview
        </Link>
      </div>
    );
  }

  const w = words[i];
  const answer = (isKnown: boolean) => {
    if (!session) setSession(words);
    update((p) => addXp(reviewWord(p, w.id, isKnown), XP_PER_REVIEW));
    if (isKnown) setKnown((k) => k + 1);
    setRevealed(false);
    setI((x) => x + 1);
  };
  const full = w.article ? `${w.article} ${w.de}` : w.de;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Close review" className="text-2xl leading-none text-muted hover:text-ink">
          ×
        </Link>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-warm transition-all" style={{ width: `${(i / words.length) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">
          {i + 1}/{words.length}
        </span>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm text-muted">What is this in German?</p>
        <p className="mt-2 text-2xl font-bold">{w.en}</p>
        {revealed ? (
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-brand">{full}</span>
              <SpeakButton text={full.split(" / ")[0]} />
            </div>
            <p>{w.example_de}</p>
            <p className="text-sm text-muted">{w.example_en}</p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">Say or think the answer, then show it.</p>
        )}
      </div>
      {revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => answer(false)} className="rounded-xl bg-bad-soft px-4 py-3.5 font-semibold text-bad">
            Didn&apos;t know
          </button>
          <button onClick={() => answer(true)} className="rounded-xl bg-good px-4 py-3.5 font-semibold text-white">
            Knew it
          </button>
        </div>
      ) : (
        <button onClick={() => setRevealed(true)} className="w-full rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink">
          Show answer
        </button>
      )}
    </div>
  );
}
