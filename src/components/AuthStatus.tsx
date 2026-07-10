"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "./UserAvatar";
import styles from "./AuthStatus.module.css";

/** Fixed top-right account control: avatar (signed in) or Google sign-in. */
export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  // Avoid a sign-in/avatar flash before the session resolves.
  if (!ready) return <span className={styles.wrapper} aria-hidden />;

  return (
    <div className={styles.wrapper}>
      {user ? (
        <Link href="/profile" className={styles.link} aria-label="Your profile">
          <UserAvatar user={user} size={36} />
        </Link>
      ) : (
        <button
          type="button"
          className={styles.link}
          onClick={signIn}
          aria-label="Sign in with Google"
        >
          <UserCircle size={24} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
