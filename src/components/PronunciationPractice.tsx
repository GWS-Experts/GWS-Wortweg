"use client";

import { useEffect, useRef, useState } from "react";
import { bestMatch, canListen, listen, listenErrorText, type Listening, type WordMatch } from "@/lib/recognition";
import { SpeakButton } from "./SpeakButton";

export interface PracticeSentence {
  de: string;
  en: string;
}

/** A score from this value up counts as well pronounced. */
export const GOOD_SCORE = 80;

export function MicIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  );
}

type Attempt = { heard: string; words: WordMatch[]; score: number };

/**
 * One sentence: listen to it, say it, see which words were understood.
 * Reports the best score so far via onScore.
 */
export function SpeakSentence({
  sentence,
  onScore,
}: {
  sentence: PracticeSentence;
  onScore?: (score: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Listening | null>(null);

  useEffect(() => () => session.current?.stop(), []);

  const start = async () => {
    if (recording) {
      session.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    setError(null);
    setInterim("");
    setAttempt(null);
    setRecording(true);
    const s = listen(setInterim);
    session.current = s;
    try {
      const heard = await s.result;
      if (!heard.length) {
        setError(listenErrorText("no-speech"));
      } else {
        const r = bestMatch(sentence.de, heard);
        setAttempt(r);
        onScore?.(r.score);
      }
    } catch (e) {
      setError(listenErrorText(e));
    } finally {
      setRecording(false);
      session.current = null;
    }
  };

  const good = attempt && attempt.score >= GOOD_SCORE;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5 text-center">
        <div className="flex items-start justify-center gap-2">
          <p className="text-2xl font-semibold leading-snug">
            {attempt
              ? attempt.words.map((w, i) => (
                  <span key={i} className={w.ok ? "text-good" : "text-bad underline decoration-wavy underline-offset-4"}>
                    {w.word}{" "}
                  </span>
                ))
              : sentence.de}
          </p>
        </div>
        <p className="mt-2 text-sm text-muted">{sentence.en}</p>
        <div className="mt-4 flex justify-center gap-2">
          <SpeakButton text={sentence.de} label="Listen" big />
          <SpeakButton text={sentence.de} label="Slowly" rate={0.6} big />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={start}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-brand-ink shadow-md transition ${
            recording ? "animate-pulse bg-bad" : "bg-brand hover:opacity-90"
          }`}
        >
          <MicIcon size={34} />
        </button>
        <p className="min-h-6 text-center text-sm text-muted">
          {recording ? interim || "Listening … say the sentence now." : attempt ? "Tap to try again." : "Tap the microphone and read the sentence aloud."}
        </p>
      </div>

      {error && <p className="rounded-xl bg-bad-soft p-3 text-sm">{error}</p>}

      {attempt && (
        <div className={`rounded-2xl p-4 ${good ? "bg-good-soft" : "bg-warm-soft"}`}>
          <p className={`text-lg font-bold ${good ? "text-good" : "text-warm"}`}>
            {attempt.score === 100 ? "Perfekt!" : good ? "Sehr gut!" : attempt.score >= 50 ? "Fast!" : "Noch einmal!"} {attempt.score}%
          </p>
          <p className="mt-1 text-sm">
            I heard: <em>„{attempt.heard}“</em>
          </p>
          {!good && (
            <p className="mt-1 text-sm text-muted">Listen again and pay attention to the red words, then try once more.</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pronunciation step for a lesson: the learner reads a few sentences aloud.
 * onDone receives the best score per sentence (null if skipped).
 */
export function PronunciationPractice({
  sentences,
  onDone,
}: {
  sentences: PracticeSentence[];
  onDone: (scores: (number | null)[]) => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [i, setI] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>(() => sentences.map(() => null));
  useEffect(() => setSupported(canListen()), []);

  if (supported === null) return null;

  if (!supported) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-warm-soft p-4">
          Your browser can&apos;t recognise speech, so the speaking practice is skipped. Chrome, Edge and Safari support
          it. You can still listen to the sentences:
        </p>
        <ul className="space-y-2">
          {sentences.map((s) => (
            <li key={s.de} className="flex items-start justify-between gap-2 rounded-xl bg-surface p-3">
              <div>
                <div className="font-medium">{s.de}</div>
                <div className="text-sm text-muted">{s.en}</div>
              </div>
              <SpeakButton text={s.de} />
            </li>
          ))}
        </ul>
        <button
          onClick={() => onDone(scores)}
          className="w-full rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink"
        >
          Continue
        </button>
      </div>
    );
  }

  const last = i === sentences.length - 1;
  const next = () => (last ? onDone(scores) : setI(i + 1));

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-muted">
        Say it aloud · sentence {i + 1} of {sentences.length}
      </p>
      <SpeakSentence
        key={i}
        sentence={sentences[i]}
        onScore={(s) => setScores((prev) => prev.map((v, k) => (k === i ? Math.max(v ?? 0, s) : v)))}
      />
      <div className="flex gap-2">
        <button onClick={next} className="rounded-xl border-2 border-line px-5 py-3 font-semibold text-muted">
          Skip
        </button>
        <button
          onClick={next}
          disabled={scores[i] === null}
          className="w-full rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink transition disabled:opacity-40"
        >
          {last ? "Continue" : "Next sentence"}
        </button>
      </div>
    </div>
  );
}

/** Picks a few short sentences from a lesson's scene for speaking practice, preferring Emma's lines. */
export function pickPracticeSentences(lines: { speaker: string; de: string; en: string }[], max = 3): PracticeSentence[] {
  const wordCount = (s: string) => s.split(/\s+/).length;
  const fits = lines.filter((l) => wordCount(l.de) >= 2 && wordCount(l.de) <= 14);
  const pool = fits.length >= max ? fits : lines;
  const emma = pool.filter((l) => l.speaker === "emma");
  const others = pool.filter((l) => l.speaker !== "emma");
  const chosen = [...emma, ...others].slice(0, max);
  // Keep the story order.
  return lines.filter((l) => chosen.includes(l)).map(({ de, en }) => ({ de, en }));
}
