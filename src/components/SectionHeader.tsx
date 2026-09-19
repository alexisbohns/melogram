"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RefObject } from "react";
import styles from "./SectionHeader.module.css";

export type SectionTab = { key: string; label: string };

type Props = {
  title: string;
  tabs: SectionTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** The section's rail, when it should get desktop scroll arrows. */
  scrollerRef?: RefObject<HTMLElement | null>;
};

/** One item's worth of scroll, gap included — falls back to a rail's width. */
function stepFor(rail: HTMLElement) {
  const first = rail.firstElementChild as HTMLElement | null;
  if (!first) return rail.clientWidth;
  const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
  return first.getBoundingClientRect().width + gap;
}

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
  scrollerRef,
}: Props) {
  const scrollBy = (direction: 1 | -1) => {
    const rail = scrollerRef?.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * stepFor(rail), behavior: "smooth" });
  };

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.row}>
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
        {scrollerRef && (
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              aria-label={`Scroll ${title} left`}
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={styles.arrow}
              aria-label={`Scroll ${title} right`}
              onClick={() => scrollBy(1)}
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
