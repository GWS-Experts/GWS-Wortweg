"use client";

import { useEffect, useState } from "react";
import { canSpeak, speak } from "@/lib/speech";

export function SpeakButton({
  text,
  label,
  rate,
  big,
}: {
  text: string;
  label?: string;
  rate?: number;
  big?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(canSpeak()), []);
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, rate);
      }}
      aria-label={`Listen: ${text}`}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-soft font-medium text-brand hover:opacity-80 ${
        big ? "px-4 py-2.5" : "h-8 w-8 text-sm"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
      {big && label}
    </button>
  );
}
