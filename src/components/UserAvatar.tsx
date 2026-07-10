/* eslint-disable @next/next/no-img-element */
import type { User } from "@supabase/supabase-js";
import styles from "./UserAvatar.module.css";

type Props = {
  user: User;
  size?: number;
  className?: string;
};

function displayName(user: User): string {
  const meta = user.user_metadata ?? {};
  return meta.full_name ?? meta.name ?? user.email ?? "Anonymous";
}

/** Round avatar from the user's Google picture, or their first initial. */
export default function UserAvatar({ user, size = 36, className = "" }: Props) {
  const meta = user.user_metadata ?? {};
  const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null;
  const name = displayName(user);
  const fallback = name.trim() ? name.trim().charAt(0).toUpperCase() : "?";

  return (
    <span
      className={`${styles.avatar} ${className}`}
      style={{ ["--size" as string]: `${size}px` }}
      aria-label={name}
      role="img"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={styles.fallback}>{fallback}</span>
      )}
    </span>
  );
}
