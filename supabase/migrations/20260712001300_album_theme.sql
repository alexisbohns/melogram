-- Store each album's color theme. The value references a named entry in the
-- app's theme catalog (src/lib/palettes.ts) — e.g. 'amber', 'violet', 'slate'.
-- The sentinel 'auto' means the palette is derived from the cover art (the
-- nearest-theme match is computed client-side). Kept as free text rather than
-- an enum so new themes are a code-only change (no migration per theme).

alter table public.albums
  add column if not exists theme text not null default 'auto';

-- Backfill the albums that already carried a hand-picked palette (previously
-- keyed by album name in src/lib/palettes.ts).
update public.albums set theme = 'amber'  where theme = 'auto' and name = 'Dawn from the Semicolon';
update public.albums set theme = 'violet' where theme = 'auto' and name = 'Bones';
update public.albums set theme = 'slate'  where theme = 'auto' and name = 'Celesta';

-- Persist a theme choice. Mirrors set_album_cover: membership-gated, and the
-- value is validated client-side against the catalog (the DB does not know it).
create or replace function public.set_album_theme(_album_id uuid, _theme text)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums set theme = _theme where id = _album_id;
end $$;

revoke all on function public.set_album_theme(uuid,text) from public;
grant execute on function public.set_album_theme(uuid,text) to authenticated;
