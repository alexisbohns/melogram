"use client";

import { ALBUM_TYPES } from "@/lib/edit";

export default function AlbumTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Album type"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ font: "inherit", padding: "4px 8px", borderRadius: 6 }}
    >
      {ALBUM_TYPES.map((t) => (
        <option key={t} value={t}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </select>
  );
}
