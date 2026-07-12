"use client";

import { ChevronDown } from "lucide-react";
import { ALBUM_TYPES } from "@/lib/edit";
import controls from "./controls.module.css";

export default function AlbumTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={controls.selectWrap} style={{ maxWidth: 220 }}>
      <select
        aria-label="Album type"
        className={controls.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ALBUM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={2} className={controls.chevron} />
    </div>
  );
}
