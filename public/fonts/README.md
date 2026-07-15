# Bundled fonts

These TTFs are read at runtime by the album social-share image generator
(`src/lib/og/albumImage.tsx`) — `next/og`/satori needs raw font data, so the
files are committed rather than fetched. They mirror the app's UI fonts
(`next/font/google` Gloock + Space Grotesk).

| File | Family | Source | License |
| --- | --- | --- | --- |
| `Gloock-Regular.ttf` | Gloock 400 | https://fonts.google.com/specimen/Gloock | SIL Open Font License 1.1 |
| `SpaceGrotesk-Medium.ttf` | Space Grotesk 500 | https://fonts.google.com/specimen/Space+Grotesk | SIL Open Font License 1.1 |

Both families are licensed under the SIL Open Font License, Version 1.1, whose
full text ships with each family at its source above.
