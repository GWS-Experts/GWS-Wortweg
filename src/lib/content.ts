import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Character, Lesson, LessonSummary, Level, Story } from "./types";

const root = join(process.cwd(), "content");

type Index = { levels: { id: string; title_en: string; lessons: string[] }[] };

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(root, ...parts), "utf8")) as T;
}

/** All lessons in learning order: A1 first, then A2, B1, B2. */
export function getAllLessons(): Lesson[] {
  const index = readJson<Index>("index.json");
  return index.levels.flatMap((level) =>
    level.lessons.map((file) => readJson<Lesson>(level.id.toLowerCase(), file)),
  );
}

export function getLevels(): Level[] {
  return readJson<Index>("index.json").levels.map(({ id, title_en }) => ({ id, title_en }));
}

export function getLessonSummaries(): LessonSummary[] {
  return getAllLessons().map(({ id, level, order, title_de, title_en, goal_en, vocabulary }) => ({
    id,
    level,
    order,
    title_de,
    title_en,
    goal_en,
    wordCount: vocabulary.length,
  }));
}

export function getLesson(id: string): Lesson | undefined {
  return getAllLessons().find((l) => l.id === id);
}

/** The lesson after this one, continuing into the next level. */
export function getNextLessonId(id: string): string | null {
  const all = getAllLessons();
  const i = all.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < all.length ? all[i + 1].id : null;
}

export function getCharacters(): { story: Story; characters: Character[] } {
  return readJson("characters.json");
}
