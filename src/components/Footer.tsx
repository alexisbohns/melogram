/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ARTIST, MENU_ITEMS, SOCIAL_LINKS } from "@/lib/site";
import { getLocale, getMessages } from "@/lib/i18n";
import styles from "./Footer.module.css";

/**
 * Bohns · menu · social, closing every page but the home — where the same
 * three blocks open the page inside the big header instead.
 */
export default async function Footer() {
  const m = getMessages(await getLocale());

  return (
    /* composites over the page background, like the header */
    <footer className={styles.footer}>
      <div className={styles.identity}>
        <Link href="/" className={styles.brand}>
          {ARTIST.name}
        </Link>

        <nav className={styles.menu}>
          {MENU_ITEMS.map((item) =>
            item.href ? (
              <Link
                key={item.key}
                href={item.href}
                className={styles.menuActive}
              >
                {m.nav[item.key]}
              </Link>
            ) : (
              <span key={item.key} className={styles.menuItem}>
                {m.nav[item.key]}
              </span>
            )
          )}
        </nav>
      </div>

      <div className={styles.social}>
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className={styles.socialItem}
            aria-label={link.name}
          >
            <img src={link.icon} alt="" width={40} height={40} />
          </a>
        ))}
      </div>
    </footer>
  );
}
