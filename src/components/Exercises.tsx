"use client";

import { useEffect, useMemo, useState } from "react";
import { normalize, speak } from "@/lib/speech";
import type { Exercise } from "@/lib/types";
import { SpeakButton } from "./SpeakButton";

/** null = not answered yet, true/false = answer is right/wrong. */
type Props<T extends Exercise["type"]> = {
  ex: Extract<Exercise, { type: T }>;
  checked: boolean;
  onReady: (correct: boolean | null) => void;
};

function shuffle<T>(items: T[], seed: string): T[] {
  // Deterministic shuffle so server and browser agree and retries look the same.
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function optionClass(state: "idle" | "selected" | "right" | "wrong") {
  const base = "w-full rounded-xl border-2 px-4 py-3 text-left font-medium transition";
  switch (state) {
    case "selected":
      return `${base} border-brand bg-brand-soft`;
    case "right":
      return `${base} border-good bg-good-soft`;
    case "wrong":
      return `${base} border-bad bg-bad-soft`;
    default:
      return `${base} border-line bg-surface hover:border-brand`;
  }
}

function ChoiceList({
  options,
  selected,
  correct,
  checked,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  correct: string;
  checked: boolean;
  onSelect: (o: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {options.map((o) => {
        let state: "idle" | "selected" | "right" | "wrong" = selected === o ? "selected" : "idle";
        if (checked && o === correct) state = "right";
        else if (checked && selected === o) state = "wrong";
        return (
          <button key={o} disabled={checked} onClick={() => onSelect(o)} className={optionClass(state)}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function MultipleChoice({ ex, checked, onReady }: Props<"multiple_choice">) {
  const [selected, setSelected] = useState<string | null>(null);
  const correct = ex.options[ex.answer];
  return (
    <ChoiceList
      options={ex.options}
      selected={selected}
      correct={correct}
      checked={checked}
      onSelect={(o) => {
        setSelected(o);
        onReady(o === correct);
      }}
    />
  );
}

export function GapFill({ ex, checked, onReady }: Props<"gap_fill">) {
  const [selected, setSelected] = useState<string | null>(null);
  const [before, after] = ex.sentence_de.split("___");
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-surface p-4 text-xl">
        {before}
        <span
          className={`mx-1 inline-block min-w-16 border-b-2 px-1 text-center font-semibold ${
            checked ? (selected === ex.answer ? "border-good text-good" : "border-bad text-bad") : "border-brand text-brand"
          }`}
        >
          {selected ?? " "}
        </span>
        {after}
      </p>
      <ChoiceList
        options={ex.options}
        selected={selected}
        correct={ex.answer}
        checked={checked}
        onSelect={(o) => {
          setSelected(o);
          onReady(o === ex.answer);
        }}
      />
    </div>
  );
}

function joinWords(words: string[]) {
  return words.join(" ").replace(/\s+([?.!,])/g, "$1");
}

export function WordOrder({ ex, checked, onReady }: Props<"word_order">) {
  const tiles = useMemo(() => shuffle(ex.words.map((w, i) => ({ w, i })), ex.id), [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  const sentence = joinWords(picked.map((i) => ex.words[i]));

  useEffect(() => {
    onReady(picked.length === ex.words.length ? sentence === ex.answer : null);
  }, [picked, sentence, ex, onReady]);

  return (
    <div className="space-y-5">
      <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface p-3">
        {picked.map((i) => (
          <button
            key={i}
            disabled={checked}
            onClick={() => setPicked((p) => p.filter((x) => x !== i))}
            className="rounded-lg bg-brand-soft px-3 py-1.5 font-medium text-brand"
          >
            {ex.words[i]}
          </button>
        ))}
        {!picked.length && <span className="text-sm text-muted">Tap the words in the right order</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map(({ w, i }) => (
          <button
            key={i}
            disabled={checked || picked.includes(i)}
            onClick={() => setPicked((p) => [...p, i])}
            className={`rounded-lg border-2 px-3 py-1.5 font-medium ${
              picked.includes(i) ? "border-line text-transparent" : "border-line bg-surface hover:border-brand"
            }`}
          >
            {w}
          </button>
        ))}
      </div>
      {checked && <p className="text-sm text-muted">Correct: {ex.answer}</p>}
    </div>
  );
}

export function ListenType({ ex, checked, onReady }: Props<"listen_type">) {
  const [value, setValue] = useState("");
  useEffect(() => {
    speak(ex.text_de);
  }, [ex.text_de]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SpeakButton text={ex.text_de} label="Play" big />
        <SpeakButton text={ex.text_de} label="Slow" rate={0.6} big />
      </div>
      <input
        autoFocus
        value={value}
        disabled={checked}
        onChange={(e) => {
          setValue(e.target.value);
          const v = normalize(e.target.value);
          onReady(v ? ex.accept.some((a) => normalize(a) === v) : null);
        }}
        placeholder="Type what you hear"
        lang="de"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full rounded-xl border-2 border-line bg-surface px-4 py-3 text-lg outline-none focus:border-brand"
      />
      {checked && <p className="text-sm text-muted">You heard: „{ex.text_de}“</p>}
    </div>
  );
}

export function MatchPairs({ ex, onReady }: Props<"match_pairs">) {
  const left = useMemo(() => shuffle(ex.pairs.map((p) => p.de), ex.id + "de"), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p) => p.en), ex.id + "en"), [ex]);
  const [pickDe, setPickDe] = useState<string | null>(null);
  const [pickEn, setPickEn] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    if (!pickDe || !pickEn) return;
    const ok = ex.pairs.some((p) => p.de === pickDe && p.en === pickEn);
    if (ok) {
      const next = [...matched, pickDe];
      setMatched(next);
      if (next.length === ex.pairs.length) onReady(mistakes === 0);
    } else {
      setMistakes((m) => m + 1);
      setWrong([pickDe, pickEn]);
      setTimeout(() => setWrong(null), 600);
    }
    setPickDe(null);
    setPickEn(null);
  }, [pickDe, pickEn, ex, matched, mistakes, onReady]);

  const enMatched = (en: string) => ex.pairs.some((p) => p.en === en && matched.includes(p.de));
  const cls = (done: boolean, picked: boolean, isWrong: boolean) =>
    optionClass(done ? "right" : isWrong ? "wrong" : picked ? "selected" : "idle") + " text-center";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="grid gap-2.5">
        {left.map((de) => (
          <button
            key={de}
            disabled={matched.includes(de)}
            onClick={() => {
              setPickDe(de);
              speak(de);
            }}
            className={cls(matched.includes(de), pickDe === de, wrong?.[0] === de)}
          >
            {de}
          </button>
        ))}
      </div>
      <div className="grid gap-2.5">
        {right.map((en) => (
          <button
            key={en}
            disabled={enMatched(en)}
            onClick={() => setPickEn(en)}
            className={cls(enMatched(en), pickEn === en, wrong?.[1] === en)}
          >
            {en}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExerciseView({
  ex,
  checked,
  onReady,
}: {
  ex: Exercise;
  checked: boolean;
  onReady: (correct: boolean | null) => void;
}) {
  switch (ex.type) {
    case "multiple_choice":
      return <MultipleChoice ex={ex} checked={checked} onReady={onReady} />;
    case "gap_fill":
      return <GapFill ex={ex} checked={checked} onReady={onReady} />;
    case "word_order":
      return <WordOrder ex={ex} checked={checked} onReady={onReady} />;
    case "listen_type":
      return <ListenType ex={ex} checked={checked} onReady={onReady} />;
    case "match_pairs":
      return <MatchPairs ex={ex} checked={checked} onReady={onReady} />;
  }
}

export function exerciseSolution(ex: Exercise): string | null {
  switch (ex.type) {
    case "multiple_choice":
      return ex.options[ex.answer];
    case "gap_fill":
      return ex.sentence_de.replace("___", ex.answer);
    case "word_order":
      return ex.answer;
    case "listen_type":
      return ex.text_de;
    default:
      return null;
  }
}

export function exerciseTranslation(ex: Exercise): string | null {
  return "translation_en" in ex ? ex.translation_en : null;
}
