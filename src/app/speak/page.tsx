import type { Metadata } from "next";
import { SpeakingPractice, type PracticeSet } from "@/components/SpeakingPractice";
import { getAllLessons, getLevels } from "@/lib/content";

export const metadata: Metadata = { title: "Speaking practice – GWS-Wortweg" };

export default function SpeakPage() {
  const lessons = getAllLessons();
  const sets: PracticeSet[] = getLevels().map((level) => ({
    level: level.id,
    sentences: lessons
      .filter((l) => l.level === level.id)
      .flatMap((l) => [
        ...l.scene.lines,
        ...l.vocabulary.map((v) => ({ de: v.example_de, en: v.example_en })),
      ])
      .filter((s) => {
        const n = s.de.split(/\s+/).length;
        return n >= 2 && n <= 14;
      })
      .map(({ de, en }) => ({ de, en })),
  }));
  return <SpeakingPractice sets={sets} />;
}
