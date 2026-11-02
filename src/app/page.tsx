import { HomeView } from "@/components/HomeView";
import { getCharacters, getLessonSummaries } from "@/lib/content";

export default function Home() {
  const lessons = getLessonSummaries();
  const { story } = getCharacters();
  return <HomeView lessons={lessons} story={story} />;
}
