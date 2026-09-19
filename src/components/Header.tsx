/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ARTIST, MENU_ITEMS, SOCIAL_LINKS } from "@/lib/site";
import { getLocale, getMessages, type Messages } from "@/lib/i18n";
import styles from "./Header.module.css";

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

function Social() {
  return (
    <div className={styles.social}>
      {SOCIAL_LINKS.map((link) => (
        <a key={link.name} href={link.href} className={styles.socialItem}>
          <span className={styles.socialName}>{link.name}</span>
          <img
            src={link.icon}
            alt=""
            width={40}
            height={40}
            className={styles.socialIcon}
          />
        </a>
      ))}
    </div>
  );
}

/**
 * The home page's opening block: brand, bio, menu and social links. Every
 * other page carries the same identity as a fixed <SiteLogo /> plus the
 * <Footer /> row instead.
 */
export default async function Header() {
  const m = getMessages(await getLocale());

  return (
    /* the whole header composites over the page background */
    <header className={styles.header}>
      <div className={styles.brand}>
        <Link href="/" className={styles.composer}>
          <img src="/brand-picture.png" alt="" className={styles.picture} />
          <img src="/logo-bohns.svg" alt="Bohns" className={styles.logo} />
        </Link>
      </div>

      <div className={styles.body}>
        <p className={styles.name}>{ARTIST.name}</p>
        <p className={styles.bio}>{ARTIST.bio}</p>
        <Menu nav={m.nav} className={styles.bodyMenu} />
      </div>

      <Social />

      <Menu nav={m.nav} className={styles.bottomMenu} />
    </header>
  );
}
