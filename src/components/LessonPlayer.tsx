"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addXp, completeLesson, XP_LESSON_BONUS, XP_PER_CORRECT } from "@/lib/progress";
import type { Lesson, LearnerOption, Line, Vocab } from "@/lib/types";
import { exerciseSolution, exerciseTranslation, ExerciseView } from "./Exercises";
import { GOOD_SCORE, pickPracticeSentences, PronunciationPractice } from "./PronunciationPractice";
import { useProgress } from "./ProgressProvider";
import { SpeakButton } from "./SpeakButton";

type Phase =
  | { kind: "scene" }
  | { kind: "word"; i: number }
  | { kind: "grammar" }
  | { kind: "exercise"; i: number }
  | { kind: "speak" }
  | { kind: "dialogue" }
  | { kind: "done" };

const articleColor: Record<string, string> = {
  der: "text-brand",
  die: "text-bad",
  das: "text-good",
};

function Primary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink transition disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}

function Bubble({ line, name, isEmma }: { line: Line; name: string; isEmma: boolean }) {
  const [showEn, setShowEn] = useState(false);
  return (
    <div className={`flex ${isEmma ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isEmma ? "rounded-br-sm bg-brand-soft" : "rounded-bl-sm border border-line bg-surface"
        }`}
      >
        <div className="mb-1 text-xs font-semibold text-muted">{name}</div>
        <div className="flex items-start gap-2">
          <button onClick={() => setShowEn((s) => !s)} className="text-left text-lg leading-snug" title="Tap to translate">
            {line.de}
          </button>
          <SpeakButton text={line.de} />
        </div>
        {showEn && <div className="mt-1 text-sm text-muted">{line.en}</div>}
      </div>
    </div>
  );
}

function WordCard({ word }: { word: Vocab }) {
  const article = word.article?.split(" ")[0];
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center">
      <div className="text-sm uppercase tracking-wide text-muted">{word.type.replace("_", " ")}</div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <h2 className="text-3xl font-bold">
          {word.article && <span className={articleColor[article ?? ""] ?? ""}>{word.article} </span>}
          {word.de}
        </h2>
        <SpeakButton text={word.article ? `${word.article.split(" / ")[0]} ${word.de.split(" / ")[0]}` : word.de} />
      </div>
      {word.plural && <div className="mt-1 text-muted">Plural: {word.plural}</div>}
      <div className="mt-3 text-xl font-medium">{word.en}</div>
      <div className="mt-6 rounded-xl bg-bg p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="text-lg">{word.example_de}</div>
          <SpeakButton text={word.example_de} />
        </div>
        <div className="text-sm text-muted">{word.example_en}</div>
      </div>
      {word.note_en && <p className="mt-4 rounded-xl bg-warm-soft p-3 text-left text-sm">💡 {word.note_en}</p>}
    </div>
  );
}

export function LessonPlayer({
  lesson,
  names,
  nextId,
}: {
  lesson: Lesson;
  names: Record<string, string>;
  nextId: string | null;
}) {
  const { update } = useProgress();
  const [phase, setPhase] = useState<Phase>({ kind: "scene" });
  const [ready, setReady] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<{ score: number; xp: number } | null>(null);
  const saved = useRef(false);
  const practice = useMemo(() => pickPracticeSentences(lesson.scene.lines), [lesson]);
  const [spokenWell, setSpokenWell] = useState(0);

  // Dialogue state
  const [turn, setTurn] = useState(0);
  const [picked, setPicked] = useState<LearnerOption | null>(null);
  const [triedWrong, setTriedWrong] = useState(false);

  const nWords = lesson.vocabulary.length;
  const nEx = lesson.exercises.length;
  const learnerTurns = lesson.dialogue.turns.filter((t) => "learner" in t).length;
  const totalSteps = 1 + nWords + 1 + nEx + 1 + 1;
  const step =
    phase.kind === "scene"
      ? 0
      : phase.kind === "word"
        ? 1 + phase.i
        : phase.kind === "grammar"
          ? 1 + nWords
          : phase.kind === "exercise"
            ? 2 + nWords + phase.i
            : phase.kind === "speak"
              ? 2 + nWords + nEx
              : phase.kind === "dialogue"
                ? 3 + nWords + nEx
                : totalSteps;

  const onReady = useCallback((r: boolean | null) => setReady(r), []);

  const check = useCallback(() => {
    if (ready === null || checked) return;
    setChecked(true);
    if (ready) setCorrectCount((c) => c + 1);
  }, [ready, checked]);

  // Match pairs check themselves once every pair is found.
  const current = phase.kind === "exercise" ? lesson.exercises[phase.i] : null;
  useEffect(() => {
    if (current?.type === "match_pairs" && ready !== null && !checked) check();
  }, [current, ready, checked, check]);

  const nextExercise = () => {
    if (phase.kind !== "exercise") return;
    setReady(null);
    setChecked(false);
    setPhase(phase.i + 1 < nEx ? { kind: "exercise", i: phase.i + 1 } : { kind: "speak" });
  };

  const finish = useCallback(
    (dialogueCorrect: number) => {
      if (saved.current) return;
      saved.current = true;
      const total = nEx + learnerTurns;
      const correct = correctCount + dialogueCorrect;
      const score = Math.round((correct / total) * 100);
      const xp = (correct + spokenWell) * XP_PER_CORRECT + XP_LESSON_BONUS;
      const words = lesson.vocabulary.map(({ id, de, article, en, example_de, example_en }) => ({
        id: `${lesson.id}:${id}`,
        de,
        article,
        en,
        example_de,
        example_en,
        lessonId: lesson.id,
      }));
      update((p) => addXp(completeLesson(p, lesson.id, score, words), xp));
      setResult({ score, xp });
      setPhase({ kind: "done" });
    },
    [nEx, learnerTurns, correctCount, spokenWell, lesson, update],
  );

  // Dialogue: count learner turns answered right at the first try.
  const [dialogueCorrect, setDialogueCorrect] = useState(0);
  const turns = lesson.dialogue.turns;
  const advanceDialogue = () => {
    const next = turn + 1;
    setPicked(null);
    setTriedWrong(false);
    if (next >= turns.length) finish(dialogueCorrect);
    else setTurn(next);
  };

  // Show speaker lines one after another; stop at learner turns.
  useEffect(() => {
    if (phase.kind !== "dialogue") return;
    const t = turns[turn];
    if (t && !("learner" in t) && turn + 1 < turns.length) {
      const timer = setTimeout(() => setTurn((x) => x + 1), 900);
      return () => clearTimeout(timer);
    }
  }, [phase.kind, turn, turns]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Close lesson" className="text-2xl leading-none text-muted hover:text-ink">
          ×
        </Link>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-good transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
        </div>
      </div>

      {phase.kind === "scene" && (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-brand">
              Lesson {lesson.order} · {lesson.level}
            </p>
            <h1 className="text-2xl font-bold">{lesson.title_de}</h1>
            <p className="text-muted">{lesson.goal_en}</p>
          </div>
          <p className="rounded-xl bg-warm-soft p-3 text-sm">{lesson.scene.setting_en}</p>
          <div className="space-y-2.5">
            {lesson.scene.lines.map((l, i) => (
              <Bubble key={i} line={l} name={names[l.speaker] ?? l.speaker} isEmma={l.speaker === "emma"} />
            ))}
          </div>
          <p className="text-center text-xs text-muted">Tap a sentence to see the English.</p>
          <Primary onClick={() => setPhase({ kind: "word", i: 0 })}>Learn the words</Primary>
        </section>
      )}

      {phase.kind === "word" && (
        <section className="space-y-4">
          <p className="text-sm font-semibold text-muted">
            New word {phase.i + 1} of {nWords}
          </p>
          <WordCard key={phase.i} word={lesson.vocabulary[phase.i]} />
          <div className="flex gap-2">
            {phase.i > 0 && (
              <button
                onClick={() => setPhase({ kind: "word", i: phase.i - 1 })}
                className="rounded-xl border-2 border-line px-5 font-semibold"
              >
                Back
              </button>
            )}
            <Primary
              onClick={() => setPhase(phase.i + 1 < nWords ? { kind: "word", i: phase.i + 1 } : { kind: "grammar" })}
            >
              Next
            </Primary>
          </div>
        </section>
      )}

      {phase.kind === "grammar" && (
        <section className="space-y-4">
          <p className="text-sm font-semibold text-muted">Grammar tip</p>
          <h2 className="text-2xl font-bold">{lesson.grammar.title_en}</h2>
          <p className="leading-relaxed">{lesson.grammar.explanation_en}</p>
          {lesson.grammar.table && (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-soft">
                  <tr>
                    {lesson.grammar.table.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lesson.grammar.table.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      {r.map((c, j) => (
                        <td key={j} className={`px-3 py-2 ${j === 0 ? "text-muted" : "font-medium"}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ul className="space-y-2">
            {lesson.grammar.examples.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-xl bg-surface p-3">
                <div>
                  <div className="font-medium">{e.de}</div>
                  <div className="text-sm text-muted">{e.en}</div>
                </div>
                <SpeakButton text={e.de} />
              </li>
            ))}
          </ul>
          <Primary onClick={() => setPhase({ kind: "exercise", i: 0 })}>Start exercises</Primary>
        </section>
      )}

      {phase.kind === "exercise" && current && (
        <section className="space-y-5">
          <p className="text-sm font-semibold text-muted">
            Exercise {phase.i + 1} of {nEx}
          </p>
          <h2 className="text-xl font-bold">{current.prompt_en}</h2>
          <ExerciseView key={current.id} ex={current} checked={checked} onReady={onReady} />
          {!checked ? (
            current.type !== "match_pairs" && (
              <Primary disabled={ready === null} onClick={check}>
                Check
              </Primary>
            )
          ) : (
            <div className={`space-y-3 rounded-2xl p-4 ${ready ? "bg-good-soft" : "bg-bad-soft"}`}>
              <p className={`text-lg font-bold ${ready ? "text-good" : "text-bad"}`}>
                {ready ? "Richtig! Well done." : "Not quite."}
              </p>
              {!ready && exerciseSolution(current) && (
                <p>
                  Correct answer: <strong>{exerciseSolution(current)}</strong>
                </p>
              )}
              {exerciseTranslation(current) && <p className="text-sm text-muted">{exerciseTranslation(current)}</p>}
              <Primary onClick={nextExercise} className={ready ? "!bg-good" : "!bg-bad"}>
                Continue
              </Primary>
            </div>
          )}
        </section>
      )}

      {phase.kind === "speak" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Speaking practice</h2>
          <PronunciationPractice
            sentences={practice}
            onDone={(scores) => {
              setSpokenWell(scores.filter((s) => s !== null && s >= GOOD_SCORE).length);
              setPhase({ kind: "dialogue" });
            }}
          />
        </section>
      )}

      {phase.kind === "dialogue" && (
        <section className="space-y-4">
          <p className="text-sm font-semibold text-muted">Your turn to talk</p>
          <p className="rounded-xl bg-warm-soft p-3 text-sm">{lesson.dialogue.setting_en}</p>
          <div className="space-y-2.5">
            {turns.slice(0, turn + 1).map((t, i) => {
              if (!("learner" in t))
                return <Bubble key={i} line={t} name={names[t.speaker] ?? t.speaker} isEmma={t.speaker === "emma"} />;
              const answered = i < turn ? t.options.find((o) => o.correct) : null;
              if (answered)
                return <Bubble key={i} line={{ speaker: "emma", de: answered.de, en: "" }} name="You" isEmma />;
              return (
                <div key={i} className="space-y-2.5 pt-2">
                  {t.options.map((o) => {
                    const state = picked === o ? (o.correct ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-line bg-surface hover:border-brand";
                    return (
                      <button
                        key={o.de}
                        disabled={picked?.correct}
                        onClick={() => {
                          setPicked(o);
                          if (o.correct && !triedWrong) setDialogueCorrect((c) => c + 1);
                          if (!o.correct) setTriedWrong(true);
                        }}
                        className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium ${state}`}
                      >
                        {o.de}
                      </button>
                    );
                  })}
                  {picked && (
                    <p className={`rounded-xl p-3 text-sm ${picked.correct ? "bg-good-soft" : "bg-bad-soft"}`}>
                      {picked.feedback_en} {!picked.correct && "Try again."}
                    </p>
                  )}
                  {picked?.correct && <Primary onClick={advanceDialogue}>Continue</Primary>}
                </div>
              );
            })}
          </div>
          {turn === turns.length - 1 && !("learner" in turns[turn]) && (
            <Primary onClick={() => finish(dialogueCorrect)}>Finish lesson</Primary>
          )}
        </section>
      )}

      {phase.kind === "done" && result && (
        <section className="space-y-5 text-center">
          <div className="text-6xl">🥨</div>
          <h2 className="text-3xl font-bold">Super gemacht!</h2>
          <p className="text-muted">You finished „{lesson.title_de}“.</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-surface p-4">
              <div className="text-2xl font-bold text-good">{result.score}%</div>
              <div className="text-xs text-muted">correct</div>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <div className="text-2xl font-bold text-brand">+{result.xp}</div>
              <div className="text-xs text-muted">XP</div>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <div className="text-2xl font-bold text-warm">{nWords}</div>
              <div className="text-xs text-muted">words to review</div>
            </div>
          </div>
          <p className="text-sm text-muted">The new words come back for review tomorrow.</p>
          <div className="space-y-2.5">
            {nextId && (
              <Link href={`/lesson/${nextId}`} className="block rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink">
                Next lesson
              </Link>
            )}
            <Link href="/" className="block rounded-xl border-2 border-line px-5 py-3 font-semibold">
              Back to overview
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
