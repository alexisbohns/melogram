# Melogram

Music showcase for [Bohns](https://bohns.design) — albums and tracks streamed
from Supabase, rebuilt on **Next.js** (App Router) with a full redesign of the
Home and Album pages.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, CSS Modules)
- [Supabase](https://supabase.com) — read-only queries against `albums`,
  `track_overview` (view) and `tracks` (lyrics); no authentication in step 1
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

- `/` — artist header (brand, bio, social links) + every album as a card with
  cover, meta tiles, description and playlist
- `/albums/[id]` — compact header, album switcher (rail on desktop,
  horizontal strip on mobile) and album detail with track descriptions and a
  lyrics sheet

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
