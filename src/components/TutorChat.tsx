"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { canListen, listen, listenErrorText, type Listening } from "@/lib/recognition";
import { speak } from "@/lib/speech";
import { accountsEnabled, getSupabase } from "@/lib/supabase";
import {
  DAILY_TUTOR_LIMIT,
  parseTutorReply,
  STREAM_ERROR_MARKER,
  TUTOR_LEVELS,
  TUTOR_NAME,
  TUTOR_TOPICS,
  type TutorLevel,
  type TutorMessage,
} from "@/lib/tutor";
import { MicIcon } from "./PronunciationPractice";
import { useProgress } from "./ProgressProvider";
import { SpeakButton } from "./SpeakButton";

const LEVEL_KEY = "gws-wortweg-level";
const VOICE_KEY = "gws-wortweg-tutor-voice";

const errorText: Record<string, string> = {
  refusal: "Lena can't answer that. Let's talk about something else!",
  busy: "Lena is very busy right now. Please try again in a minute.",
  failed: "Something went wrong. Please try again.",
};

function TutorBubble({ text, streaming }: { text: string; streaming: boolean }) {
  const [showEn, setShowEn] = useState(false);
  const { correction, german, english } = parseTutorReply(text);
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] space-y-2 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-muted">{TUTOR_NAME}</div>
        {correction && <p className="rounded-xl bg-warm-soft px-3 py-2 text-sm">✏️ {correction}</p>}
        <div className="flex items-start gap-2">
          <p className="whitespace-pre-wrap text-lg leading-snug">{german || (streaming ? "…" : "")}</p>
          {!streaming && german && <SpeakButton text={german} />}
        </div>
        {!streaming && english && (
          <button onClick={() => setShowEn((s) => !s)} className="text-left text-sm text-muted underline-offset-2 hover:underline">
            {showEn ? english : "Show English"}
          </button>
        )}
      </div>
    </div>
  );
}

export function TutorChat() {
  const { user, loaded } = useProgress();
  const [level, setLevel] = useState<TutorLevel>("A1");
  const [topic, setTopic] = useState(TUTOR_TOPICS[0].id);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [voice, setVoice] = useState(true);
  const [micSupported, setMicSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const session = useRef<Listening | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMicSupported(canListen());
    try {
      const saved = localStorage.getItem(LEVEL_KEY);
      if (TUTOR_LEVELS.includes(saved as TutorLevel)) setLevel(saved as TutorLevel);
      setVoice(localStorage.getItem(VOICE_KEY) !== "off");
    } catch {}
    return () => session.current?.stop();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  const toggleVoice = () => {
    setVoice((v) => {
      try {
        localStorage.setItem(VOICE_KEY, v ? "off" : "on");
      } catch {}
      if (v) window.speechSynthesis?.cancel();
      return !v;
    });
  };

  const send = async (history: TutorMessage[]) => {
    setError(null);
    setMessages(history);
    setStreamingText("");
    let text = "";
    try {
      const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again to talk to the tutor.");
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level, topic, messages: history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        if (res.status === 429) setRemaining(0);
        throw new Error(body?.error ?? errorText.failed);
      }
      const left = Number(res.headers.get("X-Tutor-Remaining"));
      if (!Number.isNaN(left)) setRemaining(left);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const cut = text.indexOf(STREAM_ERROR_MARKER);
        setStreamingText(cut >= 0 ? text.slice(0, cut) : text);
      }
      const cut = text.indexOf(STREAM_ERROR_MARKER);
      if (cut >= 0) {
        const kind = text.slice(cut + STREAM_ERROR_MARKER.length);
        throw new Error(errorText[kind] ?? errorText.failed);
      }
      const reply = text.trim();
      if (!reply) throw new Error(errorText.failed);
      setMessages([...history, { role: "assistant", content: reply }]);
      if (voice) {
        const { german } = parseTutorReply(reply);
        if (german) speak(german, 0.95);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : errorText.failed);
      // Let the learner resend their message: put it back into the input.
      const last = history[history.length - 1];
      if (last?.role === "user") {
        setMessages(history.slice(0, -1));
        setInput(last.content);
      }
    } finally {
      setStreamingText(null);
    }
  };

  const start = () => {
    setStarted(true);
    setMessages([]);
    send([]);
  };

  const submit = () => {
    const text = input.trim();
    if (!text || streamingText !== null) return;
    setInput("");
    send([...messages, { role: "user", content: text.slice(0, 600) }]);
  };

  const record = async () => {
    if (recording) {
      session.current?.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    setError(null);
    setRecording(true);
    const before = input ? `${input.trim()} ` : "";
    const s = listen((t) => setInput(before + t));
    session.current = s;
    try {
      const heard = await s.result;
      if (heard.length) setInput(before + heard[0]);
    } catch (e) {
      setError(listenErrorText(e));
    } finally {
      setRecording(false);
      session.current = null;
    }
  };

  if (!accountsEnabled) {
    return <p className="rounded-2xl bg-warm-soft p-4">The AI tutor needs accounts, which are turned off for this app.</p>;
  }
  if (!loaded) return null;
  if (!user) {
    return (
      <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h1 className="text-2xl font-bold">Talk with {TUTOR_NAME}</h1>
        <p>
          {TUTOR_NAME} is your AI conversation partner. Chat with her in German by typing or speaking, and she&apos;ll
          gently correct your mistakes.
        </p>
        <p className="text-muted">Please sign in first. It&apos;s free, and you only need your email address.</p>
        <Link href="/account" className="inline-block rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink">
          Sign in
        </Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Talk with {TUTOR_NAME}</h1>
          <p className="text-muted">
            Your AI conversation partner from Marzling. Write or speak in German; {TUTOR_NAME} answers at your level and
            corrects your most important mistakes.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Your level</h2>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-surface p-1.5">
            {TUTOR_LEVELS.map((lv) => (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                aria-pressed={lv === level}
                className={`rounded-xl py-2 font-bold transition ${lv === level ? "bg-brand text-brand-ink" : "hover:bg-brand-soft"}`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">What do you want to talk about?</h2>
          <div className="flex flex-wrap gap-2">
            {TUTOR_TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTopic(t.id)}
                aria-pressed={t.id === topic}
                className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium ${
                  t.id === topic ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface"
                }`}
              >
                {t.title_en}
              </button>
            ))}
          </div>
        </div>
        <button onClick={start} className="w-full rounded-xl bg-brand px-5 py-3.5 text-lg font-semibold text-brand-ink">
          Start conversation
        </button>
        <p className="text-center text-xs text-muted">
          Up to {DAILY_TUTOR_LIMIT} messages per day. Your messages are processed by Anthropic&apos;s AI model Claude and
          are not stored by GWS-Wortweg.
        </p>
      </div>
    );
  }

  const busy = streamingText !== null;
  const topicTitle = TUTOR_TOPICS.find((t) => t.id === topic)?.title_en;

  return (
    <div className="flex min-h-[70vh] flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Talk with {TUTOR_NAME}</h1>
          <p className="text-sm text-muted">
            {level} · {topicTitle}
            {remaining !== null && ` · ${remaining} messages left today`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={toggleVoice}
            aria-pressed={voice}
            title={voice ? "Lena's replies are read aloud" : "Lena's replies are not read aloud"}
            aria-label="Read Lena's replies aloud"
            className={`h-9 w-9 rounded-full text-base ${voice ? "bg-brand-soft" : "bg-line opacity-60"}`}
          >
            {voice ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => {
              window.speechSynthesis?.cancel();
              setStarted(false);
              setMessages([]);
              setError(null);
            }}
            className="h-9 rounded-full border border-line px-3 text-sm font-medium"
          >
            New
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <TutorBubble key={i} text={m.content} streaming={false} />
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-soft px-4 py-3 text-lg leading-snug">
                {m.content}
              </div>
            </div>
          ),
        )}
        {streamingText !== null && <TutorBubble text={streamingText} streaming />}
        {error && (
          <div className="space-y-2 rounded-xl bg-bad-soft p-3 text-sm">
            <p>{error}</p>
            {messages.length === 0 && remaining !== 0 && (
              <button onClick={() => send([])} className="font-semibold underline">
                Try again
              </button>
            )}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2"
        >
          {micSupported && (
            <button
              type="button"
              onClick={record}
              disabled={busy}
              aria-label={recording ? "Stop recording" : "Speak your answer"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-brand-ink transition disabled:opacity-40 ${
                recording ? "animate-pulse bg-bad" : "bg-brand"
              }`}
            >
              <MicIcon />
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={600}
            rows={1}
            placeholder={recording ? "Listening …" : "Schreib auf Deutsch …"}
            aria-label="Your message"
            className="min-h-12 flex-1 resize-none rounded-2xl border-2 border-line bg-surface px-4 py-2.5 text-lg outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || remaining === 0}
            className="h-12 shrink-0 rounded-full bg-brand px-4 font-semibold text-brand-ink disabled:opacity-40"
          >
            Send
          </button>
        </form>
        {micSupported && (
          <p className="mt-1.5 text-center text-xs text-muted">Tap the microphone, speak, then check the text and send.</p>
        )}
      </div>
    </div>
  );
}
