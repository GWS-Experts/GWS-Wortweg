import type { Metadata } from "next";
import { TutorChat } from "@/components/TutorChat";

export const metadata: Metadata = { title: "Talk with Lena – GWS-Wortweg" };

export default function TutorPage() {
  return <TutorChat />;
}
