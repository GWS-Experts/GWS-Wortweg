"use client";

import Link from "next/link";
import { useState } from "react";
import { useProgress } from "@/components/ProgressProvider";
import { accountsEnabled, getSupabase } from "@/lib/supabase";

const syncText = {
  local: "Saved on this device only.",
  syncing: "Saving…",
  synced: "Your progress is saved to your account.",
  error: "Could not save to your account. We'll keep trying; your progress is safe on this device.",
};

export default function AccountPage() {
  const { user, sync, signOut, progress } = useProgress();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!accountsEnabled) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted">Accounts are not set up yet. Your progress is saved on this device.</p>
        <Link href="/" className="text-brand underline">
          Back to overview
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Your account</h1>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-semibold">{user.email}</p>
          <p className="mt-3 text-sm">{syncText[sync]}</p>
          <p className="mt-3 text-sm text-muted">
            {Object.keys(progress.lessons).length} lessons done · {Object.keys(progress.words).length} words learned · {progress.xp} XP in total
          </p>
        </div>
        <button onClick={signOut} className="rounded-xl border-2 border-line px-5 py-3 font-semibold">
          Sign out
        </button>
      </div>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await getSupabase()!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setState(error ? "error" : "sent");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-muted">
        Sign in to keep your progress on all your devices. You can also learn without an account; your progress is then saved on this
        device.
      </p>
      {state === "sent" ? (
        <p className="rounded-xl bg-good-soft p-4">Check your inbox: we sent a sign-in link to {email}.</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-line bg-surface px-4 py-3 outline-none focus:border-brand"
              placeholder="you@example.com"
            />
          </label>
          <button
            disabled={state === "sending"}
            className="w-full rounded-xl bg-brand px-5 py-3.5 font-semibold text-brand-ink disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          {state === "error" && <p className="text-sm text-bad">Something went wrong. Please try again.</p>}
        </form>
      )}
    </div>
  );
}
