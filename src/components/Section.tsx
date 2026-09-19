import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = {
  title: string;
  /** Anchor target, so a link elsewhere on the page can scroll here. */
  id?: string;
  /** Control shown opposite the heading (the story editor's locale tabs). */
  action?: ReactNode;
  children: ReactNode;
};

/** A titled section of a page's main column — see Section.module.css. */
export default function Section({ title, id, action, children }: Props) {
  return (
    <section className={styles.section} id={id}>
      {action ? (
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className={styles.heading}>{title}</h2>
      )}
      {children}
    </section>
  );
}
