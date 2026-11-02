/** Reads German text aloud with the browser's built-in speech output. */
export function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = rate;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("de"));
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
