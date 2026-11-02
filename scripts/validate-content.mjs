// Checks all lesson files in content/ for structural errors.
// Usage: node scripts/validate-content.mjs
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const characters = JSON.parse(readFileSync(join(root, "characters.json"), "utf8"));
const speakerIds = new Set(characters.characters.map((c) => c.id));
const exerciseTypes = new Set(["multiple_choice", "gap_fill", "word_order", "listen_type", "match_pairs"]);
const articles = new Set(["der", "die", "das", "die / der", "der / die"]);

const errors = [];
const seenIds = new Set();
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const index = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
const levels = index.levels.flatMap((l) => l.lessons.map((f) => join(l.id.toLowerCase(), f)));
for (const rel of levels) {
  if (!existsSync(join(root, rel))) err(rel, "listed in content/index.json but the file is missing");
}

for (const level of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(join(root, level.name)).filter((f) => f.endsWith(".json"))) {
    const rel = join(level.name, file);
    if (!levels.includes(rel)) err(rel, "not listed in content/index.json");
    let lesson;
    try {
      lesson = JSON.parse(readFileSync(join(root, rel), "utf8"));
    } catch (e) {
      err(rel, `invalid JSON: ${e.message}`);
      continue;
    }
    for (const key of ["id", "level", "order", "title_de", "title_en", "goal_en", "scene", "vocabulary", "grammar", "exercises", "dialogue"]) {
      if (lesson[key] === undefined) err(rel, `missing "${key}"`);
    }
    if (seenIds.has(lesson.id)) err(rel, `duplicate lesson id ${lesson.id}`);
    if (lesson.level?.toLowerCase() !== level.name) err(rel, `level "${lesson.level}" doesn't match folder "${level.name}"`);
    seenIds.add(lesson.id);

    for (const line of lesson.scene?.lines ?? []) {
      if (!speakerIds.has(line.speaker)) err(rel, `unknown speaker "${line.speaker}" in scene`);
      if (!line.de || !line.en) err(rel, "scene line without de/en");
    }
    for (const v of lesson.vocabulary ?? []) {
      if (!v.id || !v.de || !v.en || !v.example_de || !v.example_en) err(rel, `vocabulary "${v.id}" is incomplete`);
      if (v.type === "noun" && !articles.has(v.article)) err(rel, `noun "${v.id}" needs an article`);
    }
    for (const ex of lesson.exercises ?? []) {
      if (seenIds.has(ex.id)) err(rel, `duplicate exercise id ${ex.id}`);
      seenIds.add(ex.id);
      if (!exerciseTypes.has(ex.type)) err(rel, `exercise ${ex.id} has unknown type "${ex.type}"`);
      if (ex.type === "multiple_choice" && !(ex.answer >= 0 && ex.answer < ex.options?.length)) err(rel, `${ex.id}: answer index out of range`);
      if (ex.type === "gap_fill") {
        if (!ex.sentence_de?.includes("___")) err(rel, `${ex.id}: sentence needs a ___ gap`);
        if (!ex.options?.includes(ex.answer)) err(rel, `${ex.id}: answer not among options`);
      }
      if (ex.type === "word_order") {
        const words = [...ex.words].sort().join(" ");
        const expected = ex.answer.replace(/([?.!])$/, " $1").split(" ").sort().join(" ");
        if (words !== expected) err(rel, `${ex.id}: words don't match the answer`);
      }
      if (ex.type === "listen_type" && !(ex.text_de && ex.accept?.length)) err(rel, `${ex.id}: needs text_de and accept`);
      if (ex.type === "match_pairs" && !(ex.pairs?.length >= 3)) err(rel, `${ex.id}: needs at least 3 pairs`);
    }
    for (const turn of lesson.dialogue?.turns ?? []) {
      if (turn.learner) {
        const correct = turn.options?.filter((o) => o.correct).length;
        if (correct !== 1) err(rel, "each learner turn needs exactly one correct option");
        if (turn.options?.some((o) => !o.feedback_en)) err(rel, "every learner option needs feedback_en");
      } else if (!speakerIds.has(turn.speaker)) {
        err(rel, `unknown speaker "${turn.speaker}" in dialogue`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${seenIds.size} lesson and exercise ids checked.`);
