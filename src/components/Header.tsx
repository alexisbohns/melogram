/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ARTIST, MENU_ITEMS, SOCIAL_LINKS } from "@/lib/site";
import { getLocale, getMessages, type Messages } from "@/lib/i18n";
import styles from "./Header.module.css";

type Props = {
  variant: "home" | "compact";
};

function Menu({ nav, className }: { nav: Messages["nav"]; className?: string }) {
  return (
    <nav className={`${styles.menu} ${className ?? ""}`}>
      {MENU_ITEMS.map((item) =>
        item.href ? (
          <Link key={item.key} href={item.href} className={styles.menuActive}>
            {nav[item.key]}
          </Link>
        ) : (
          <span key={item.key} className={styles.menuItem}>
            {nav[item.key]}
          </span>
        )
      )}
    </nav>
  );
}

function Social({ withLabels }: { withLabels: boolean }) {
  return (
    <div className={styles.social}>
      {SOCIAL_LINKS.map((link) => (
        <a key={link.name} href={link.href} className={styles.socialItem}>
          {withLabels && (
            <span className={styles.socialName}>{link.name}</span>
          )}
          <img
            src={link.icon}
            alt={withLabels ? "" : link.name}
            width={40}
            height={40}
          />
        </a>
      ))}
    </div>
  );
}

export default async function Header({ variant }: Props) {
  const isHome = variant === "home";
  const m = getMessages(await getLocale());

  return (
    /* the whole header composites over the page background */
    <header className={`${styles.header} ${styles[variant]}`}>
      <div className={styles.brand}>
        <Link href="/" className={styles.composer}>
          <img src="/brand-picture.png" alt="" className={styles.picture} />
          <img src="/logo-bohns.svg" alt="Bohns" className={styles.logo} />
        </Link>
      </div>

      <div className={styles.body}>
        <p className={styles.name}>{ARTIST.name}</p>
        {isHome && <p className={styles.bio}>{ARTIST.bio}</p>}
        <Menu nav={m.nav} className={styles.bodyMenu} />
      </div>

      <Social withLabels={isHome} />

      {isHome && <Menu nav={m.nav} className={styles.bottomMenu} />}
    </header>
  );
}
