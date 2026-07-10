import { CalendarClock, Cloud, ListMusic } from "lucide-react";
import { SOURCE_LABEL } from "@/lib/site";
import styles from "./AlbumMetaTiles.module.css";

type Props = {
  genre: string;
  year: string;
  direction?: "vertical" | "horizontal";
};

export default function AlbumMetaTiles({
  genre,
  year,
  direction = "vertical",
}: Props) {
  const tiles = [
    { icon: ListMusic, label: genre },
    { icon: CalendarClock, label: year },
    { icon: Cloud, label: SOURCE_LABEL },
  ];

  return (
    <div className={`${styles.tiles} ${styles[direction]}`}>
      {tiles.map(({ icon: Icon, label }) => (
        <div key={label} className={styles.tile}>
          <Icon size={24} strokeWidth={2} className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </div>
      ))}
    </div>
  );
}
