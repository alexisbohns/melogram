/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import styles from "./SiteLogo.module.css";

/**
 * The Bohns signature, pinned to the top-left of every page but the home —
 * the counterpart to the fixed account button on the right. Like the home
 * header it composites over the page background with `color-dodge`, so the
 * soft grey artwork reads pink.
 */
export default function SiteLogo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Bohns">
      <img src="/logo-bohns.svg" alt="" width={210} height={87} />
    </Link>
  );
}
