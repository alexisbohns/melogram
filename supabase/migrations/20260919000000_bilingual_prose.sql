-- Bilingual prose (2026-09-19).
--
-- `description` did two incompatible jobs: the short blurb in the strips and
-- the only place to write at length. It is split in two — `description` stays
-- short (strips, rows), `story` holds long markdown (the track and album
-- pages) — and both become bilingual via `_fr` columns.
--
-- The 200-character rule on `description` is NOT enforced here. Phase 1 seeds
-- `story` from today's descriptions, phase 2 is Alexis rewriting them by hand,
-- and phase 3 adds the check constraint. See the design spec, §9.

alter table public.tracks
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

alter table public.albums
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

-- Phase 1 seed: today's descriptions ARE the prose. Nothing is lost.
update public.tracks set story = description where description is not null;
update public.albums set story = description where description is not null;
