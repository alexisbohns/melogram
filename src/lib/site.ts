/**
 * Site-wide hardcoded content (step 1).
 * Social URLs and the Top/Bio destinations are placeholders for now.
 */

export const ARTIST = {
  name: "Bohns",
  bio: "Music is my most intuitive way of expressing what words can't hold. I compose and switch instruments across rock, folk, cinematic, electronic, rap, and experimental textures.",
};

export type SocialLink = {
  name: string;
  href: string;
  icon: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  { name: "Soundcloud", href: "#", icon: "/icons/soundcloud.svg" },
  { name: "Spotify", href: "#", icon: "/icons/spotify.svg" },
  { name: "Deezer", href: "#", icon: "/icons/deezer.svg" },
  { name: "Apple Music", href: "#", icon: "/icons/apple-music.svg" },
];

export type MenuItem = {
  /** Dictionary key under `nav.*`; the label text lives in src/lib/i18n. */
  key: "home" | "top" | "bio";
  href: string | null;
};

export const MENU_ITEMS: MenuItem[] = [
  { key: "home", href: "/" },
  { key: "top", href: null },
  { key: "bio", href: null },
];

/** Label of the hardcoded "source" meta tile. */
export const SOURCE_LABEL = "Soundcloud";

/**
 * Canonical site origin, used as `metadataBase` so Open Graph / Twitter image
 * URLs resolve to absolute links crawlers can fetch. Prefers an explicit
 * `NEXT_PUBLIC_SITE_URL`, falls back to Vercel's deploy URL, then localhost.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
