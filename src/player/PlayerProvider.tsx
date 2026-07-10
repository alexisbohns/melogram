"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlayerTrack = {
  id: string;
  name: string;
  url: string;
};

type PlayerContextValue = {
  currentId: string | null;
  isPlaying: boolean;
  toggle: (track: PlayerTrack) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const toggle = useCallback(
    (track: PlayerTrack) => {
      const audio = getAudio();
      setCurrentId((current) => {
        if (current === track.id) {
          // .play() called synchronously in the click handler (autoplay policy)
          if (audio.paused) void audio.play();
          else audio.pause();
          return current;
        }
        audio.src = track.url;
        void audio.play();
        return track.id;
      });
    },
    [getAudio]
  );

  const value = useMemo(
    () => ({ currentId, isPlaying, toggle }),
    [currentId, isPlaying, toggle]
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
