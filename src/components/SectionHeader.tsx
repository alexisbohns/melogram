"use client";

import styles from "./SectionHeader.module.css";

export type SectionTab = { key: string; label: string };

type Props = {
  title: string;
  tabs: SectionTab[];
  activeKey: string;
  onSelect: (key: string) => void;
};

/**
 * Home section header: the site-title font for the name plus a row of
 * underlined tabs. Renders in `mix-blend-mode: color-dodge` (like the site
 * header) so its soft-grey content composites to pink over the page.
 */
export default function SectionHeader({
  title,
  tabs,
  activeKey,
  onSelect,
}: Props) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.tabs} role="tablist" aria-label={title}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.active : ""}`}
              onClick={() => onSelect(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
