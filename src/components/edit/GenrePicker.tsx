"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import type { Genre } from "@/lib/types";
import { getGenres } from "@/lib/data";
import { createGenre } from "@/lib/edit";
import styles from "./GenrePicker.module.css";

export default function GenrePicker({
  selected,
  onChange,
}: {
  selected: Genre[];
  onChange: (genres: Genre[]) => void;
}) {
  const [all, setAll] = useState<Genre[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getGenres()
      .then(setAll)
      .catch((e) => console.error("load genres", e));
  }, []);

  const selectedIds = useMemo(
    () => new Set(selected.map((g) => g.id)),
    [selected]
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (g) => !selectedIds.has(g.id) && (!q || g.name.toLowerCase().includes(q))
    );
  }, [all, query, selectedIds]);

  const exact = all.some(
    (g) => g.name.toLowerCase() === query.trim().toLowerCase()
  );

  function add(g: Genre) {
    onChange([...selected, g]);
    setQuery("");
    setOpen(false);
  }
  function remove(id: string) {
    onChange(selected.filter((g) => g.id !== id));
  }
  async function createAndAdd() {
    const name = query.trim();
    if (!name) return;
    try {
      const g = await createGenre(name);
      setAll((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
      add(g);
    } catch (e) {
      console.error("create genre", e);
      alert("Could not create genre: " + (e as Error).message);
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.chips}>
        {selected.map((g) => (
          <span key={g.id} className={styles.chip}>
            {g.name}
            <button
              type="button"
              aria-label={`Remove ${g.name}`}
              onClick={() => remove(g.id)}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          value={query}
          placeholder="Add genre…"
          aria-label="Search or add genre"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && (matches.length > 0 || (query.trim() && !exact)) && (
          <ul className={styles.menu}>
            {matches.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(g)}
                >
                  {g.name}
                </button>
              </li>
            ))}
            {query.trim() && !exact && (
              <li>
                <button
                  type="button"
                  className={styles.create}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={createAndAdd}
                >
                  <Plus size={14} strokeWidth={2.5} /> Create “{query.trim()}”
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
