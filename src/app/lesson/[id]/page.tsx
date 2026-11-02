import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/LessonPlayer";
import { getAllLessons, getCharacters, getLesson, getNextLessonId } from "@/lib/content";

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lesson = getLesson((await params).id);
  return { title: lesson ? `${lesson.title_de} – GWS-Wortweg` : "GWS-Wortweg" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  const names = Object.fromEntries(getCharacters().characters.map((c) => [c.id, c.name]));
  return <LessonPlayer lesson={lesson} names={names} nextId={getNextLessonId(lesson.id)} />;
}
