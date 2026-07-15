/**
 * Source-of-truth message dictionary. `Messages = typeof en` becomes the
 * contract every other locale must satisfy (see ./fr.ts). Kept as a plain
 * object — not `as const` — so values widen to `string`, which is what lets
 * `fr` hold different text under the same keys.
 *
 * Scope: UI chrome only. Long-form content (the artist bio) is intentionally
 * left in src/lib/site.ts and not translated yet.
 */
export const en = {
  nav: { home: "Home", top: "Top", bio: "Bio" },
  sections: {
    tracks: "Tracks",
    albums: "Albums",
    popular: "Popular",
    latests: "Latests",
    all: "All",
  },
  account: {
    triggerLabel: "Account menu",
    sectionAccount: "Account",
    profile: "Profile",
    myLikes: "My Likes",
    language: "Language",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  profile: { nameFallback: "You" },
  likes: {
    title: "My likes",
    empty:
      "You haven't liked any tracks yet. Tap the heart on a track to save it here.",
  },
  meta: {
    homeTitle: "Bohns — Melogram",
    homeDescription:
      "Music is my most intuitive way of expressing what words can't hold.",
    profileTitle: "Profile — Bohns",
    likesTitle: "My likes — Bohns",
  },
};

export type Messages = typeof en;
