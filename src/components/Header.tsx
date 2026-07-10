/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ARTIST, MENU_ITEMS, SOCIAL_LINKS } from "@/lib/site";
import styles from "./Header.module.css";

type Props = {
  variant: "home" | "compact";
};

function Menu({ className }: { className?: string }) {
  return (
    <nav className={`${styles.menu} ${className ?? ""}`}>
      {MENU_ITEMS.map((item) =>
        item.href ? (
          <Link key={item.label} href={item.href} className={styles.menuActive}>
            {item.label}
          </Link>
        ) : (
          <span key={item.label} className={styles.menuItem}>
            {item.label}
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

export default function Header({ variant }: Props) {
  const isHome = variant === "home";

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
        <Menu className={styles.bodyMenu} />
      </div>

      <Social withLabels={isHome} />

      {isHome && <Menu className={styles.bottomMenu} />}
    </header>
  );
}
