"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "@/lib/types";
import { recordPlay } from "@/lib/plays";

export type PlayerTrack = {
  id: string;
  name: string;
  url: string;
  albumId: string | null;
  albumName: string | null;
  coverUrl: string | null;
  /** Album theme key, so the player resolves the same palette as the album. */
  theme: string | null;
  /** Track blurb shown in the player's expanded details drawer. */
  description: string | null;
  /**
   * Track lyrics. Not part of the `track_overview` view, so callers that have
   * them (the album page) pass them through; null everywhere else, which hides
   * the expanded player's Lyrics action.
   */
  lyrics: string | null;
};

export type RepeatMode = "none" | "one" | "all";

type PlayerContextValue = {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  repeat: RepeatMode;
  time: number;
  duration: number;
  /**
   * The single <audio> element that actually plays. Shared with the waveform
   * visualizer so the whole app owns exactly one media element — see the
   * comment in `getAudio` for why a second element breaks iOS lock-screen
   * controls. Null until the first track loads.
   */
  audioElement: HTMLAudioElement | null;
  /** Replace the queue (an album's playable tracks) and start at index. */
  playFrom: (tracks: PlayerTrack[], index: number) => void;
  /** Play/pause the current track. */
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  cycleRepeat: () => void;
  /** Drop deleted tracks/versions from the queue; stop if one is playing. */
  evict: (ids: string[]) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

/**
 * Map a `track_overview` row (with a playable URL) to a queue entry. Lyrics
 * live outside the view, so callers that have them (the album page) pass them
 * in; they default to null so the player's Lyrics action simply stays hidden.
 */
export function toPlayerTrack(
  track: Track,
  lyrics: string | null = null
): PlayerTrack {
  return {
    id: track.track_id,
    name: track.track_name,
    url: track.latest_resource_url!,
    albumId: track.album_id,
    albumName: track.album_name,
    coverUrl: track.album_cover_url,
    theme: track.album_theme ?? null,
    description: track.track_description,
    lyrics,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("all");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The audio/MediaSession event handlers are registered once; they read the
  // latest state and actions through refs, synced after every render.
  const stateRef = useRef({ queue, index, repeat });
  const actionsRef = useRef({
    step: (() => false) as (delta: 1 | -1, autoplay: boolean) => boolean,
    next: () => {},
    previous: () => {},
    seek: (() => {}) as (seconds: number) => void,
  });

  const lastPositionSync = useRef(0);

  const syncPositionState = useCallback((force = false) => {
    const audio = audioRef.current;
    const session =
      typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!audio || !session || typeof session.setPositionState !== "function")
      return;
    const now = Date.now();
    if (!force && now - lastPositionSync.current < 1000) return;
    lastPositionSync.current = now;
    try {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        session.setPositionState({
          duration: audio.duration,
          position: Math.min(audio.currentTime, audio.duration),
          playbackRate: audio.playbackRate,
        });
      }
    } catch {}
  }, []);

  const syncMetadata = useCallback((track: PlayerTrack) => {
    if (typeof navigator === "undefined" || !navigator.mediaSession) return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: "Bohns",
        album: track.albumName ?? "Melogram",
        artwork: track.coverUrl ? [{ src: track.coverUrl }] : undefined,
      });
    } catch {}
  }, []);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audioRef.current = audio;

    // Attach the element to the document. iOS ties the lock-screen "Now
    // Playing" controls (play/pause icon, and tapping to re-open the tab) to a
    // media element that lives in the DOM; a detached `new Audio()` shows a
    // stale play/pause state. It renders nothing without `controls`.
    if (typeof document !== "undefined") {
      audio.setAttribute("aria-hidden", "true");
      document.body.appendChild(audio);
    }

    const setPlaybackState = (state: MediaSessionPlaybackState) => {
      try {
        if (navigator.mediaSession) navigator.mediaSession.playbackState = state;
      } catch {}
    };

    audio.addEventListener("play", () => {
      setIsPlaying(true);
      setPlaybackState("playing");
    });
    audio.addEventListener("pause", () => {
      setIsPlaying(false);
      setPlaybackState("paused");
    });
    audio.addEventListener("timeupdate", () => {
      setTime(audio.currentTime);
      syncPositionState();
    });
    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      syncPositionState(true);
    });
    audio.addEventListener("ended", () => {
      if (stateRef.current.repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      actionsRef.current.step(1, true);
    });

    // Lock-screen / notification controls (iOS 15+, Android)
    if (typeof navigator !== "undefined" && navigator.mediaSession) {
      const safeSet = (
        action: MediaSessionAction,
        handler: MediaSessionActionHandler
      ) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {}
      };
      safeSet("play", () => void audio.play());
      safeSet("pause", () => audio.pause());
      safeSet("previoustrack", () => actionsRef.current.previous());
      safeSet("nexttrack", () => actionsRef.current.next());
      safeSet("seekto", (details) => {
        if (typeof details.seekTime === "number")
          actionsRef.current.seek(details.seekTime);
      });
    }

    // Publish the element so the waveform visualizer can share it rather than
    // spin up a second, competing <audio> element.
    setAudioEl(audio);
    return audio;
  }, [syncPositionState]);

  const loadTrack = useCallback(
    (track: PlayerTrack, autoplay: boolean) => {
      const audio = getAudio();
      setDuration(0);
      setTime(0);
      audio.src = track.url;
      if (autoplay) {
        void audio.play();
        void recordPlay(track.id, "web");
      }
      syncMetadata(track);
      syncPositionState(true);
    },
    [getAudio, syncMetadata, syncPositionState]
  );

  /** Advance by delta within the queue; returns false at a `none` boundary. */
  const step = useCallback(
    (delta: 1 | -1, autoplay: boolean) => {
      const { queue, index, repeat } = stateRef.current;
      if (queue.length === 0) return false;
      let nextIndex = index + delta;
      if (nextIndex >= queue.length) {
        if (repeat !== "all") return false;
        nextIndex = 0;
      }
      if (nextIndex < 0) nextIndex = 0;
      setIndex(nextIndex);
      loadTrack(queue[nextIndex], autoplay);
      return true;
    },
    [loadTrack]
  );

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!step(1, true) && audio) {
      // end of queue without repeat: stop on the last track
      audio.pause();
      audio.currentTime = 0;
      setTime(0);
    }
  }, [step]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = seconds;
      setTime(seconds);
      syncPositionState(true);
    },
    [syncPositionState]
  );

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3 || stateRef.current.index === 0) {
      seek(0);
      return;
    }
    step(-1, true);
  }, [step, seek]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, []);

  const playFrom = useCallback(
    (tracks: PlayerTrack[], startIndex: number) => {
      if (tracks.length === 0) return;
      const bounded = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      setQueue(tracks);
      setIndex(bounded);
      loadTrack(tracks[bounded], true);
    },
    [loadTrack]
  );

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) =>
      mode === "none" ? "all" : mode === "all" ? "one" : "none"
    );
  }, []);

  const evict = useCallback((ids: string[]) => {
    const dead = new Set(ids);
    const { queue, index } = stateRef.current;
    const playing = queue[index] ?? null;
    const nextQueue = queue.filter((t) => !dead.has(t.id));
    if (nextQueue.length === queue.length) return;
    setQueue(nextQueue);
    if (playing && dead.has(playing.id)) {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      setIsPlaying(false);
      setTime(0);
      setDuration(0);
      setIndex(0);
    } else if (playing) {
      const i = nextQueue.findIndex((t) => t.id === playing.id);
      if (i >= 0) setIndex(i);
    }
  }, []);

  // Detach the audio element from the DOM when the provider unmounts (the app
  // teardown); guards against leaking the element across hot reloads.
  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.remove();
      }
    },
    []
  );

  useEffect(() => {
    stateRef.current = { queue, index, repeat };
  }, [queue, index, repeat]);

  useEffect(() => {
    actionsRef.current = { step, next, previous, seek };
  }, [step, next, previous, seek]);

  const current = queue[index] ?? null;

  const value = useMemo(
    () => ({
      current,
      queue,
      isPlaying,
      repeat,
      time,
      duration,
      audioElement: audioEl,
      playFrom,
      toggle,
      next,
      previous,
      seek,
      cycleRepeat,
      evict,
    }),
    [
      current,
      queue,
      isPlaying,
      repeat,
      time,
      duration,
      audioEl,
      playFrom,
      toggle,
      next,
      previous,
      seek,
      cycleRepeat,
      evict,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}
