import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import Header from "@/components/Header";
import UserAvatar from "@/components/UserAvatar";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMessages } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return { title: m.meta.profileTitle };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const m = getMessages(await getLocale());
  const meta = user.user_metadata ?? {};
  const name: string =
    meta.full_name ?? meta.name ?? user.email ?? m.profile.nameFallback;

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <main className={styles.content}>
        <section className={styles.card}>
          <UserAvatar user={user} size={96} />
          <div className={styles.details}>
            <p className={styles.name}>{name}</p>
            {user.email && <p className={styles.email}>{user.email}</p>}
          </div>

          <Link href="/likes" className={styles.likesLink}>
            <Heart size={18} strokeWidth={2} />
            <span>{m.account.myLikes}</span>
          </Link>

          <form action="/auth/signout" method="post">
            <button type="submit" className={styles.signout}>
              {m.account.signOut}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
