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
    singles: "Singles",
    popular: "Popular",
    latests: "Latests",
    all: "All",
    notes: "Notes",
  },
  account: {
    triggerLabel: "Account menu",
    sectionAccount: "Account",
    profile: "Profile",
    myLikes: "My Likes",
    sectionArtist: "Artist",
    orderAlbums: "Order albums",
    language: "Language",
    signIn: "Sign in",
    signOut: "Sign out",
  },
  profile: { nameFallback: "You" },
  player: {
    expand: "Show track details",
    collapse: "Hide track details",
    album: "Album",
    lyrics: "Lyrics",
    track: "Track",
  },
  likes: {
    title: "My likes",
    empty:
      "You haven't liked any tracks yet. Tap the heart on a track to save it here.",
  },
  albumOrder: {
    title: "Order albums",
    intro:
      "Move an album up or down to change where it sits in the Albums section of the home page.",
    moveUp: "Move {name} up",
    moveDown: "Move {name} down",
    hidden: "Not on home yet",
    hiddenHint: "Albums without a playable track stay hidden from listeners, but keep their place in the order.",
    empty: "You don't have any albums yet.",
    save: "Save order",
    saving: "Saving…",
    saved: "Order saved",
    reset: "Reset",
    error: "Save failed",
  },
  meta: {
    homeTitle: "Bohns — Melogram",
    homeDescription:
      "Music is my most intuitive way of expressing what words can't hold.",
    profileTitle: "Profile — Bohns",
    likesTitle: "My likes — Bohns",
    albumOrderTitle: "Order albums — Bohns",
  },
};

export type Messages = typeof en;
