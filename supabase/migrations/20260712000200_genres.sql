-- Controlled genre vocabulary (searchable combobox source) + album links.

-- Full slug helper (genres appear in URLs/filters, not storage paths, so unlike
-- track/artist 3-char slugs this is a real slug).
create or replace function public.slugify(_text text)
  returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9]+', '-', 'g'));
$$;

create table if not exists public.genres (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null default '',
  created_at timestamptz not null default now()
);

-- Keep slug in sync with name via trigger (a plain default can't reference name
-- reliably across updates).
create or replace function public.genres_set_slug()
  returns trigger language plpgsql as $$
begin
  new.slug := public.slugify(new.name);
  return new;
end $$;

drop trigger if exists genres_slug on public.genres;
create trigger genres_slug before insert or update of name on public.genres
  for each row execute function public.genres_set_slug();

create table if not exists public.album_genres (
  album_id uuid not null references public.albums(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (album_id, genre_id)
);

alter table public.genres       enable row level security;
alter table public.album_genres enable row level security;

drop policy if exists "public read genres" on public.genres;
create policy "public read genres" on public.genres for select using (true);

drop policy if exists "public read album_genres" on public.album_genres;
create policy "public read album_genres" on public.album_genres for select using (true);
