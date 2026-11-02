"use client";

import { useEffect, useMemo, useState } from "react";
import { canListen } from "@/lib/recognition";
import { type PracticeSentence, SpeakSentence } from "./PronunciationPractice";

export interface PracticeSet {
  level: string;
  sentences: PracticeSentence[];
}

const LEVEL_KEY = "gws-wortweg-level";

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Free pronunciation training with sentences from all lessons of a level. */
export function SpeakingPractice({ sets }: { sets: PracticeSet[] }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [level, setLevel] = useState(sets[0]?.level ?? "A1");
  const [order, setOrder] = useState<PracticeSentence[]>([]);
  const [i, setI] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  useEffect(() => {
    setSupported(canListen());
    try {
      const saved = localStorage.getItem(LEVEL_KEY);
      if (sets.some((s) => s.level === saved)) setLevel(saved!);
    } catch {}
  }, [sets]);

  const pool = useMemo(() => sets.find((s) => s.level === level)?.sentences ?? [], [sets, level]);
  useEffect(() => {
    setOrder(shuffled(pool));
    setI(0);
    setScores([]);
  }, [pool]);

  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const sentence = order[i % Math.max(order.length, 1)];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Speaking practice</h1>
        <p className="text-muted">Read sentences from the lessons aloud. The app shows which words it understood.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-surface p-1.5">
        {sets.map((s) => (
          <button
            key={s.level}
            onClick={() => setLevel(s.level)}
            aria-pressed={s.level === level}
            className={`rounded-xl py-2 font-bold transition ${s.level === level ? "bg-brand text-brand-ink" : "hover:bg-brand-soft"}`}
          >
            {s.level}
          </button>
        ))}
      </div>

      {supported === false && (
        <p className="rounded-2xl bg-warm-soft p-4">
          Your browser can&apos;t recognise speech. Please open GWS-Wortweg in Chrome, Edge or Safari to practise
          speaking. You can still listen to the sentences.
        </p>
      )}

      {sentence && (
        <>
          {supported ? (
            <SpeakSentence
              key={`${level}-${i}`}
              sentence={sentence}
              onScore={(s) =>
                setScores((prev) => {
                  const next = [...prev];
                  next[i] = Math.max(next[i] ?? 0, s);
                  return next;
                })
              }
            />
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5 text-center">
              <p className="text-2xl font-semibold">{sentence.de}</p>
              <p className="mt-2 text-sm text-muted">{sentence.en}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted">
              {i + 1} sentences{average !== null && ` · average ${average}%`}
            </p>
            <button
              onClick={() => setI(i + 1)}
              className="ml-auto rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink"
            >
              Next sentence
            </button>
          </div>
        </>
      )}
    </div>
  );
}
