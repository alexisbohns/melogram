"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useLikes } from "./LikesProvider";
import styles from "./LikeButton.module.css";

type Props = {
  trackId: string;
  likeCount: number;
};

/** Heart toggle + like count with optimistic update and rollback. */
export default function LikeButton({ trackId, likeCount }: Props) {
  const { signedIn, isLiked, toggle } = useLikes();
  const [count, setCount] = useState(likeCount);
  const [busy, setBusy] = useState(false);

  const liked = isLiked(trackId);

  async function onClick() {
    if (busy) return;

    // Signed out: let the provider start the sign-in flow, don't touch the count.
    if (!signedIn) {
      toggle(trackId);
      return;
    }

    setBusy(true);
    const wasLiked = liked;
    setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1)); // optimistic

    const { ok } = await toggle(trackId);
    if (!ok) {
      setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1))); // rollback
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={`${styles.like} ${liked ? styles.liked : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={
        count > 0
          ? `${liked ? "Unlike" : "Like"} — ${count} ${count === 1 ? "like" : "likes"}`
          : liked
            ? "Unlike"
            : "Like"
      }
    >
      <Heart size={20} strokeWidth={2} fill={liked ? "currentColor" : "none"} />
      {count > 0 && (
        <span className={styles.tooltip} role="tooltip">
          {count} {count === 1 ? "like" : "likes"}
        </span>
      )}
    </button>
  );
}
