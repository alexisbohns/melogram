"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type ToggleResult = { ok: boolean };

type LikesContextValue = {
  /** Whether a user session is active (needed to like). */
  signedIn: boolean;
  /** True once the initial session/likes fetch has settled. */
  ready: boolean;
  isLiked: (trackId: string) => boolean;
  /** Optimistically flip a like and persist it (RLS-checked). */
  toggle: (trackId: string) => Promise<ToggleResult>;
};

const LikesContext = createContext<LikesContextValue | null>(null);

export function useLikes(): LikesContextValue {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error("useLikes must be used within <LikesProvider>");
  return ctx;
}

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);
  const supabaseRef = useRef(createClient());

  const loadLikes = useCallback(async (uid: string) => {
    const supabase = supabaseRef.current;
    const { data, error } = await supabase
      .from("track_likes")
      .select("track_id")
      .eq("user_id", uid);
    if (error) {
      console.error("Failed to load likes", error.message);
      return;
    }
    setLiked(
      new Set(
        (data ?? []).map((row: { track_id: string }) => row.track_id)
      )
    );
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) await loadLikes(uid);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadLikes(uid);
      } else {
        setLiked(new Set());
      }
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [loadLikes]);

  const signIn = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const isLiked = useCallback((trackId: string) => liked.has(trackId), [liked]);

  const toggle = useCallback(
    async (trackId: string): Promise<ToggleResult> => {
      if (!userId) {
        await signIn();
        return { ok: false };
      }

      const wasLiked = liked.has(trackId);

      // Optimistic set update.
      setLiked((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(trackId);
        else next.add(trackId);
        return next;
      });

      const supabase = supabaseRef.current;
      const { error } = wasLiked
        ? await supabase
            .from("track_likes")
            .delete()
            .eq("user_id", userId)
            .eq("track_id", trackId)
        : await supabase
            .from("track_likes")
            .upsert(
              { user_id: userId, track_id: trackId },
              { onConflict: "user_id,track_id" }
            );

      if (error) {
        // Roll back the optimistic change.
        setLiked((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(trackId);
          else next.delete(trackId);
          return next;
        });
        console.error("Failed to toggle like", error.message);
        return { ok: false };
      }

      return { ok: true };
    },
    [userId, liked, signIn]
  );

  const value = useMemo<LikesContextValue>(
    () => ({ signedIn: Boolean(userId), ready, isLiked, toggle }),
    [userId, ready, isLiked, toggle]
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}
