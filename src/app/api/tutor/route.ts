import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase";
import {
  CORRECTION_PREFIX,
  STREAM_ERROR_MARKER,
  TRANSLATION_PREFIX,
  TUTOR_LEVELS,
  TUTOR_NAME,
  TUTOR_TOPICS,
  type TutorLevel,
  type TutorMessage,
} from "@/lib/tutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Claude Opus 5.5 by default. TUTOR_MODEL can switch to a cheaper model (e.g. claude-haiku-5-5).
const MODEL = process.env.TUTOR_MODEL || "claude-opus-5-5";
// Server-side fallback re-runs a declined request on another model; Haiku has none.
const USE_FALLBACKS = !MODEL.startsWith("claude-haiku");

const MAX_HISTORY = 30;
const MAX_USER_CHARS = 600;
const MAX_ASSISTANT_CHARS = 3000;
const START_NOTE = "[The learner has opened the chat. Greet them briefly and start the conversation with a question.]";

const levelGuide: Record<TutorLevel, string> = {
  A1: "A1 (beginner): very short, simple main clauses in the present tense, the most common everyday words, one question at a time. Speak slowly and clearly in writing: max. 2 short sentences.",
  A2: "A2 (elementary): short sentences, present tense and Perfekt, modal verbs, common everyday topics. Max. 3 short sentences.",
  B1: "B1 (intermediate): natural everyday German with subordinate clauses (weil, dass, wenn), Präteritum of common verbs, some idioms. Max. 4 sentences.",
  B2: "B2 (upper intermediate): natural, varied German including passive, Konjunktiv II, connectors and idiomatic expressions. Max. 5 sentences.",
};

function systemPrompt(level: TutorLevel, topicBrief: string): string {
  return `You are ${TUTOR_NAME}, a warm, patient German tutor in GWS-Wortweg, a free app where English speakers learn German. You live in Marzling, a village near Freising in Bavaria. You chat with one learner in a free conversation so they practise speaking and writing German. The learner often speaks into a microphone, so their messages may come from speech recognition: ignore missing punctuation and capitalisation, and don't correct obvious recognition slips.

Learner level: ${levelGuide[level]}
Conversation topic: ${topicBrief}

How to reply:
- Write your reply in German at the learner's level. Keep the conversation going: react to what the learner said and usually end with one question.
- If the learner's last message had real German mistakes (grammar, word order, gender, wrong word), add one line at the very start that begins with "${CORRECTION_PREFIX}" and gives the corrected sentence followed by a very short explanation in English, for example: "${CORRECTION_PREFIX} Ich bin 30 Jahre alt. – In German you say you 'are' years old: 'sein', not 'haben'." Correct only the one or two most important mistakes. If there were no real mistakes, leave the line out; don't praise every message.
- If the learner writes in English or asks how to say something, help them briefly and invite them to try in German.
- Always end with one line that begins with "${TRANSLATION_PREFIX}" and gives an English translation of your German reply (not of the correction).
- Plain text only: no Markdown headings, lists or bold. No emojis except the two line markers.
- Stay on language learning and everyday life in Germany. If asked about something unsuitable, steer kindly back to the conversation.
Latency-sensitive; begin your visible answer immediately.`;
}

function bad(status: number, error: string) {
  return Response.json({ error }, { status });
}

function parseBody(body: unknown): { level: TutorLevel; topicBrief: string; messages: TutorMessage[] } | null {
  if (!body || typeof body !== "object") return null;
  const { level, topic, messages } = body as Record<string, unknown>;
  if (!TUTOR_LEVELS.includes(level as TutorLevel)) return null;
  const t = TUTOR_TOPICS.find((x) => x.id === topic);
  if (!t || !Array.isArray(messages) || messages.length > 200) return null;
  const clean: TutorMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return null;
    if (content.length > (role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS)) return null;
    if (clean.length && clean[clean.length - 1].role === role) return null;
    clean.push({ role, content: content.trim() });
  }
  // The conversation is either empty (start) or ends with the learner's message.
  if (clean.length && clean[clean.length - 1].role !== "user") return null;
  return { level: level as TutorLevel, topicBrief: t.brief, messages: clean };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return bad(503, "The AI tutor isn't set up yet.");
  if (!supabaseUrl || !supabaseKey) return bad(503, "Accounts are turned off.");

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return bad(401, "Please sign in to talk to the tutor.");

  const input = parseBody(await req.json().catch(() => null));
  if (!input) return bad(400, "Invalid request.");

  // Check the sign-in and count this message against the daily limit.
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return bad(401, "Please sign in again to talk to the tutor.");
  const { data: left, error: useError } = await supabase.rpc("tutor_use");
  if (useError) {
    console.error("tutor_use failed", useError);
    return bad(500, "The tutor is not available right now.");
  }
  if (typeof left !== "number" || left < 0) {
    return bad(429, "You've reached today's limit for the tutor. Come back tomorrow!");
  }

  // Keep the most recent part of the conversation; it must start with the learner.
  let history = input.messages.slice(-MAX_HISTORY);
  if (history[0]?.role === "assistant") history = [{ role: "user", content: START_NOTE }, ...history];
  if (!history.length) history = [{ role: "user", content: START_NOTE }];
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 2000,
            output_config: { effort: "low" },
            cache_control: { type: "ephemeral" },
            system: systemPrompt(input.level, input.topicBrief),
            messages,
            ...(USE_FALLBACKS ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          },
          { signal: req.signal },
        );
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}refusal`));
        }
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("tutor stream failed", err);
          const kind =
            err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && err.status === 529)
              ? "busy"
              : "failed";
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}${kind}`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Tutor-Remaining": String(left),
    },
  });
}
