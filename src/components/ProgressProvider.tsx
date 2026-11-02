"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { emptyProgress, mergeProgress, parseProgress, type Progress } from "@/lib/progress";
import { getSupabase } from "@/lib/supabase";

const STORAGE_KEY = "gws-wortweg-progress";

type SyncState = "local" | "syncing" | "synced" | "error";

type Ctx = {
  progress: Progress;
  loaded: boolean;
  update: (fn: (p: Progress) => Progress) => void;
  user: User | null;
  sync: SyncState;
  signOut: () => Promise<void>;
};

const ProgressContext = createContext<Ctx | null>(null);

function loadLocal(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function saveLocal(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage can be full or blocked; progress then lives for this visit only.
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<SyncState>("local");
  const progressRef = useRef(progress);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = loadLocal();
    progressRef.current = p;
    setProgress(p);
    setLoaded(true);
  }, []);

  const push = useCallback(async (p: Progress, u: User) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setSync("syncing");
    const { error } = await supabase
      .from("progress")
      .upsert({ user_id: u.id, data: p, updated_at: new Date().toISOString() });
    setSync(error ? "error" : "synced");
  }, []);

  // When someone signs in, merge their saved progress with this device's.
  const pullAndMerge = useCallback(
    async (u: User) => {
      const supabase = getSupabase();
      if (!supabase) return;
      setSync("syncing");
      const { data, error } = await supabase.from("progress").select("data").eq("user_id", u.id).maybeSingle();
      if (error) {
        setSync("error");
        return;
      }
      const merged = data ? mergeProgress(progressRef.current, parseProgress(data.data)) : progressRef.current;
      progressRef.current = merged;
      setProgress(merged);
      saveLocal(merged);
      await push(merged, u);
    },
    [push],
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !loaded) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) pullAndMerge(u);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === "SIGNED_IN" && u) pullAndMerge(u);
      if (!u) setSync("local");
    });
    return () => sub.subscription.unsubscribe();
  }, [loaded, pullAndMerge]);

  const update = useCallback(
    (fn: (p: Progress) => Progress) => {
      const next = fn(progressRef.current);
      progressRef.current = next;
      setProgress(next);
      saveLocal(next);
      if (user) {
        if (pushTimer.current) clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => push(next, user), 800);
      }
    },
    [user, push],
  );

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  return (
    <ProgressContext.Provider value={{ progress, loaded, update, user, sync, signOut }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
