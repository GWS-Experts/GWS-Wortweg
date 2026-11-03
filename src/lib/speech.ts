// Speech output with the browser's built-in voices. Every device ships its own
// German voices, so we pick the closest match to the app's voice: a clear,
// natural-sounding female German voice (like Agata, the AI tutor).

/** Known female German voices, best first. Names are matched case-insensitively. */
const FEMALE_VOICES = [
  "seraphina", // Edge: Microsoft Seraphina Online (Natural)
  "katja", // Edge/Windows: Microsoft Katja
  "amala", // Edge: Microsoft Amala Online (Natural)
  "louisa", // Edge: Microsoft Louisa Online (Natural)
  "tanja",
  "elke",
  "gisela",
  "klarissa",
  "maja",
  "ingrid",
  "hedda", // Windows: Microsoft Hedda
  "google deutsch", // Chrome (female)
  "anna", // Apple
  "petra", // Apple
  "helena", // Apple
  "marlene",
  "vicki",
  "female",
  "weiblich",
];

/** Known male German voices, used only when nothing else is available. */
const MALE_VOICES = [
  "conrad", "killian", "florian", "stefan", "bernd", "christoph", "kasper", "klaus", "ralf",
  "markus", "martin", "yannick", "hans", "male", "männlich",
];

const quality = (v: SpeechSynthesisVoice) => /natural|neural|premium|enhanced|online/i.test(v.name);

function score(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  if (MALE_VOICES.some((m) => name.includes(m)) && !name.includes("female")) return -100;
  const i = FEMALE_VOICES.findIndex((f) => name.includes(f));
  let s = i >= 0 ? 100 - i : 0;
  if (quality(v)) s += 50;
  if (v.lang.toLowerCase() === "de-de" || v.lang.toLowerCase() === "de_de") s += 10;
  if (!v.localService) s += 1; // cloud voices tend to sound more natural
  return s;
}

let chosen: SpeechSynthesisVoice | null | undefined;

function germanVoice(): SpeechSynthesisVoice | null {
  if (chosen !== undefined) return chosen;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("de"));
  if (!voices.length) return null; // voices may not be loaded yet; try again next time
  chosen = voices.reduce((best, v) => (score(v) > score(best) ? v : best), voices[0]);
  return chosen;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Chrome loads its voices asynchronously.
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    chosen = undefined;
  });
}

/** Reads German text aloud with the browser's built-in speech output. */
export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = rate;
  const voice = germanVoice();
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Compares typed answers loosely: case, punctuation and ß/ss don't count. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[.,!?;:'"„“–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
