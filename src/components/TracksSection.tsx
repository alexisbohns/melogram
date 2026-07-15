"use client";

import { useState } from "react";
import type { Track } from "@/lib/types";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import SectionHeader from "./SectionHeader";
import StandaloneTrack from "./StandaloneTrack";
import styles from "./TracksSection.module.css";

type Props = {
  popular: Track[];
  latest: Track[];
};

/** Home "Tracks" section: standalone tracks under Popular / Latests tabs. */
export default function TracksSection({ popular, latest }: Props) {
  const m = useMessages();
  const [tab, setTab] = useState<"popular" | "latest">("popular");

  if (popular.length === 0 && latest.length === 0) return null;

  const tracks = tab === "popular" ? popular : latest;
  const tabs = [
    { key: "popular", label: m.sections.popular },
    { key: "latest", label: m.sections.latests },
  ];

  return (
    <section className={styles.section}>
      <SectionHeader
        title={m.sections.tracks}
        tabs={tabs}
        activeKey={tab}
        onSelect={(key) => setTab(key as "popular" | "latest")}
      />
      <ul className={styles.tracks}>
        {tracks.map((track) => (
          <StandaloneTrack
            key={track.track_id}
            track={track}
            queue={tracks}
          />
        ))}
      </ul>
    </section>
  );
}
