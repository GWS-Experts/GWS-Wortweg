export type Line = { speaker: string; de: string; en: string };

export type Vocab = {
  id: string;
  de: string;
  article?: string;
  plural?: string | null;
  type: string;
  en: string;
  example_de: string;
  example_en: string;
  note_en?: string;
};

export type Grammar = {
  title_en: string;
  explanation_en: string;
  table?: { headers: string[]; rows: string[][] };
  examples: { de: string; en: string }[];
};

export type Exercise =
  | { id: string; type: "multiple_choice"; prompt_en: string; options: string[]; answer: number }
  | {
      id: string;
      type: "gap_fill";
      prompt_en: string;
      sentence_de: string;
      options: string[];
      answer: string;
      translation_en: string;
    }
  | { id: string; type: "word_order"; prompt_en: string; words: string[]; answer: string; translation_en: string }
  | { id: string; type: "listen_type"; prompt_en: string; text_de: string; accept: string[]; translation_en: string }
  | { id: string; type: "match_pairs"; prompt_en: string; pairs: { de: string; en: string }[] };

export type LearnerOption = { de: string; correct: boolean; feedback_en: string };
export type DialogueTurn = Line | { learner: true; options: LearnerOption[] };

export type Lesson = {
  id: string;
  level: string;
  order: number;
  title_de: string;
  title_en: string;
  goal_en: string;
  scene: { setting_en: string; lines: Line[] };
  vocabulary: Vocab[];
  grammar: Grammar;
  exercises: Exercise[];
  dialogue: { setting_en: string; turns: DialogueTurn[] };
};

export type Character = { id: string; name: string; role_en: string; speaks: string };

export type Story = { title_de: string; title_en: string; summary_en: string };

export type LessonSummary = Pick<Lesson, "id" | "level" | "order" | "title_de" | "title_en" | "goal_en"> & {
  wordCount: number;
};

/** A word as stored for review, with everything needed to show it later. */
export type ReviewWord = Pick<Vocab, "id" | "de" | "article" | "en" | "example_de" | "example_en"> & {
  lessonId: string;
};
