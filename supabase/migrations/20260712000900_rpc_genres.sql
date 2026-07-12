-- Any authenticated artist_member may extend the genre vocabulary.

create or replace function public.create_genre(_name text)
  returns public.genres
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _g public.genres;
begin
  if not exists (select 1 from public.artist_members where user_id = auth.uid()) then
    raise exception 'only artist members may create genres' using errcode = '42501';
  end if;
  insert into public.genres (name) values (_name)
    on conflict (name) do update set name = excluded.name
    returning * into _g;
  return _g;
end $$;

revoke all on function public.create_genre(text) from public;
grant execute on function public.create_genre(text) to authenticated;
