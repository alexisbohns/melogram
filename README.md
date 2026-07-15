# Melogram

Music showcase for [Bohns](https://bohns.design) — albums and tracks streamed
from Supabase, rebuilt on **Next.js** (App Router) with a full redesign of the
Home and Album pages.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, CSS Modules)
- [Supabase](https://supabase.com) — public content (`albums`, `track_overview`
  view, `tracks` lyrics) plus Google sign-in and per-user likes
  (`@supabase/ssr`)
- [lucide-react](https://lucide.dev) icons
- Fonts: Gloock (display) + Space Grotesk via `next/font`

## Design notes

- The site header renders with `mix-blend-mode: color-dodge` over the dark
  mauve background (`#11090C`) — its soft-grey content composites to pink.
- Each album has a color palette theme (`light` / `accent` / `deep`) applied
  through CSS custom properties. Palettes are hardcoded in
  `src/lib/palettes.ts` for now (no Supabase model change, step 1).
- Track durations are not stored in the database; they resolve client-side
  from audio metadata (`preload="metadata"`).

## Pages

- `/` — artist header (brand, bio, social links) then two tabbed sections: a
  **Tracks** section of standalone tracks (the cover doubles as the play/pause
  control) under _Popular_ / _Latests_ tabs, and an **Albums** section of album
  cards filtered by genre. Popularity ranks a track by `likes × 10 + plays ÷ 10`
  (play totals come from the `track_play_counts` view)
- `/albums/[id]` — compact header, album switcher (rail on desktop,
  horizontal strip on mobile) and album detail with track descriptions and a
  lyrics sheet

Playing a track queues its whole album into a global player bar: waveform
timeline (wavesurfer.js) recolored per album palette, play/pause,
next/previous, repeat (`all` by default), scrubbing, and MediaSession
metadata + handlers for lock-screen controls on iOS/Android. Playback
survives page navigation (the player lives above the router).

## Accounts & likes

- **Sign in with Google** from the account button (top-right on every page).
  OAuth runs through Supabase Auth: the browser client starts the flow, Google
  redirects back to `/auth/callback`, and the route handler exchanges the code
  for a cookie session. `middleware.ts` keeps the session fresh.
- **Likes** are per-user and persisted in the `track_likes` table. The heart on
  each track toggles a row via the browser client (writes are guarded by
  row-level security), with an optimistic count and rollback on failure. The
  public catalog stays statically cached (ISR) — only the like state is resolved
  client-side, so pages don't become per-user dynamic.
- `/profile` shows the signed-in user and a sign-out control; `/likes` lists the
  tracks the user has liked, most recent first.

Supabase clients live in `src/lib/supabase/`: `anon.ts` (public read-only
content), `client.ts` (browser, auth + likes) and `server.ts` (cookie-bound, for
the callback route and the protected pages). The `track_likes` schema + RLS are
in `supabase/migrations/20260710_track_likes.sql`.

> The hosted project must have Google enabled as an auth provider and
> `<site>/auth/callback` in its redirect allow-list. No extra environment
> variables are needed beyond the two below.

## Development

```bash
cp .env.example .env.local   # fill in the Supabase URL + anon key
npm install
npm run dev
```

Required environment variables (also needed on Vercel):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International** License.

> You are free to share, adapt, and build upon this work **for non-commercial purposes only**, as long as you provide appropriate credit.

🔗 [Read the full license](https://creativecommons.org/licenses/by-nc/4.0/)
