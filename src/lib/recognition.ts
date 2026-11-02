import { normalize } from "./speech";

// Minimal typings for the Web Speech API's recognition part, which TypeScript's
// DOM library doesn't include. Chrome, Edge and Safari support it (Chrome and Edge
// send the audio to their speech service); Firefox doesn't.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResultList {
  length: number;
  [i: number]: { length: number; isFinal: boolean; [j: number]: RecognitionAlternative };
}
interface RecognitionEvent {
  resultIndex: number;
  results: RecognitionResultList;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return ctor() !== null;
}

export type ListenError = "not-allowed" | "no-speech" | "network" | "unsupported" | "other";

export interface Listening {
  /** Stops listening and keeps what was heard so far. */
  stop(): void;
  /** Resolves with the alternatives the browser heard (best first), or an empty list. */
  result: Promise<string[]>;
}

/**
 * Listens to one German utterance with the browser's speech recognition.
 * onInterim receives the text while the learner is still speaking.
 */
export function listen(onInterim?: (text: string) => void): Listening {
  const Ctor = ctor();
  if (!Ctor) return { stop() {}, result: Promise.reject<string[]>("unsupported" satisfies ListenError) };

  const rec = new Ctor();
  rec.lang = "de-DE";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;

  let finals: string[] = [];
  let interim = "";
  let error: ListenError | null = null;

  const result = new Promise<string[]>((resolve, reject) => {
    rec.onresult = (e) => {
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finals = Array.from({ length: r.length }, (_, j) => r[j].transcript.trim()).filter(Boolean);
        } else {
          interim += r[0].transcript;
        }
      }
      onInterim?.(finals[0] ?? interim);
    };
    rec.onerror = (e) => {
      error =
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "not-allowed"
          : e.error === "no-speech"
            ? "no-speech"
            : e.error === "network"
              ? "network"
              : e.error === "aborted"
                ? null
                : "other";
    };
    rec.onend = () => {
      const heard = finals.length ? finals : interim.trim() ? [interim.trim()] : [];
      if (error && !heard.length) reject(error);
      else resolve(heard);
    };
  });

  try {
    rec.start();
  } catch {
    return { stop() {}, result: Promise.reject<string[]>("other" satisfies ListenError) };
  }
  return { stop: () => rec.stop(), result };
}

export function listenErrorText(e: unknown): string {
  switch (e as ListenError) {
    case "not-allowed":
      return "Microphone access was blocked. Allow the microphone for this site in your browser settings and try again.";
    case "no-speech":
      return "I didn't hear anything. Tap the microphone and speak a little louder.";
    case "network":
      return "Speech recognition needs an internet connection. Please check your connection.";
    case "unsupported":
      return "Your browser can't recognise speech. Please use Chrome, Edge or Safari.";
    default:
      return "Something went wrong with the microphone. Please try again.";
  }
}

// ---------- Comparing what was said with the target sentence ----------

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const umlauts = (s: string) => s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");

/** Recognisers write numbers as digits; the lessons mostly spell them out. */
const numberWords: Record<string, string> = {
  "0": "null", "1": "eins", "2": "zwei", "3": "drei", "4": "vier", "5": "fünf", "6": "sechs",
  "7": "sieben", "8": "acht", "9": "neun", "10": "zehn", "11": "elf", "12": "zwölf", "20": "zwanzig",
};

function words(s: string): string[] {
  return normalize(s.replace(/(\S)-(\S)/g, "$1$2"))
    .split(" ")
    .filter(Boolean)
    .map((w) => numberWords[w] ?? w);
}

function close(a: string, b: string): boolean {
  if (a === b) return true;
  const x = umlauts(a);
  const y = umlauts(b);
  if (x === y) return true;
  // Allow one slip in longer words (recognisers often mishear endings slightly).
  return Math.max(x.length, y.length) >= 5 && distance(x, y) <= 1;
}

export interface WordMatch {
  word: string;
  ok: boolean;
}

/** Marks each word of the target as heard or not, in order (longest common subsequence). */
export function compareSpeech(target: string, heard: string): { words: WordMatch[]; score: number } {
  const display = target.split(/\s+/).filter(Boolean);
  const t = display.map((w) => words(w).join(" "));
  const h = words(heard);
  const dp = Array.from({ length: t.length + 1 }, () => Array(h.length + 1).fill(0) as number[]);
  for (let i = t.length - 1; i >= 0; i--)
    for (let j = h.length - 1; j >= 0; j--)
      dp[i][j] = close(t[i], h[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const ok = Array(t.length).fill(false) as boolean[];
  let i = 0;
  let j = 0;
  while (i < t.length && j < h.length) {
    if (close(t[i], h[j])) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // Words that are only punctuation (e.g. "–") count as fine.
  const result = display.map((word, k) => ({ word, ok: ok[k] || t[k] === "" }));
  const counted = t.filter((w) => w !== "").length || 1;
  const score = Math.round((ok.filter((v, k) => v && t[k] !== "").length / counted) * 100);
  return { words: result, score };
}

/** Picks the alternative that matches the target best. */
export function bestMatch(target: string, heard: string[]): { heard: string; words: WordMatch[]; score: number } {
  let best = { heard: heard[0] ?? "", ...compareSpeech(target, heard[0] ?? "") };
  for (const alt of heard.slice(1)) {
    const r = compareSpeech(target, alt);
    if (r.score > best.score) best = { heard: alt, ...r };
  }
  return best;
}
