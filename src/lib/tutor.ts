// Shared between the tutor page and the tutor API route.

export const TUTOR_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type TutorLevel = (typeof TUTOR_LEVELS)[number];

export interface TutorTopic {
  id: string;
  title_en: string;
  /** What the tutor should steer the conversation towards. */
  brief: string;
}

export const TUTOR_TOPICS: TutorTopic[] = [
  { id: "free", title_en: "Free conversation", brief: "Anything the learner wants to talk about. Start by asking how their day is going." },
  { id: "intro", title_en: "Introduce yourself", brief: "Getting to know each other: name, origin, where they live, work, family, hobbies." },
  { id: "bakery", title_en: "At the bakery", brief: "A role play: you are the shop assistant at the bakery in Marzling, the learner is a customer buying bread and pastries." },
  { id: "weekend", title_en: "Your weekend", brief: "What the learner did last weekend and plans for next weekend." },
  { id: "doctor", title_en: "At the doctor's", brief: "A role play: you are the receptionist or doctor at a practice in Freising, the learner is a patient describing symptoms." },
  { id: "directions", title_en: "Asking the way", brief: "A role play in Freising: the learner asks for directions to the station, the cathedral or the town hall." },
  { id: "opinion", title_en: "Your opinion", brief: "Discuss a topic and exchange opinions, e.g. city vs. country life, working from home, or public transport." },
  { id: "interview", title_en: "Job interview", brief: "A role play: you interview the learner for a job they choose. Ask typical interview questions." },
];

export const TUTOR_NAME = "Agata";

/** Marks the tutor's correction line and translation line in a reply. */
export const CORRECTION_PREFIX = "✏️";
export const TRANSLATION_PREFIX = "🇬🇧";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

/** Splits a tutor reply into correction, German text and English translation. */
export function parseTutorReply(text: string): { correction: string | null; german: string; english: string | null } {
  const lines = text.split("\n");
  const correction: string[] = [];
  const english: string[] = [];
  const german: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(CORRECTION_PREFIX)) correction.push(t.slice(CORRECTION_PREFIX.length).trim());
    else if (t.startsWith(TRANSLATION_PREFIX)) english.push(t.slice(TRANSLATION_PREFIX.length).trim());
    else german.push(line);
  }
  return {
    correction: correction.length ? correction.join("\n") : null,
    german: german.join("\n").trim(),
    english: english.length ? english.join(" ") : null,
  };
}

/** Errors the tutor API sends inside the text stream. */
export const STREAM_ERROR_MARKER = "\u0000ERROR:";

export const DAILY_TUTOR_LIMIT = 30;
