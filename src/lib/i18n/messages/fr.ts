import type { Messages } from "./en";

/**
 * French dictionary, typed against `Messages` so a missing or extra key fails
 * the build. Endonyms/flags live in ../config.ts, not here.
 */
export const fr: Messages = {
  nav: { home: "Accueil", top: "Top", bio: "Bio" },
  sections: {
    tracks: "Morceaux",
    albums: "Albums",
    singles: "Singles",
    popular: "Populaires",
    latests: "Récents",
    all: "Tous",
    notes: "Notes",
  },
  account: {
    triggerLabel: "Menu du compte",
    sectionAccount: "Compte",
    profile: "Profil",
    myLikes: "Mes favoris",
    sectionArtist: "Artiste",
    orderAlbums: "Ordonner les albums",
    language: "Langue",
    signIn: "Se connecter",
    signOut: "Se déconnecter",
  },
  profile: { nameFallback: "Vous" },
  player: {
    expand: "Afficher les détails du titre",
    collapse: "Masquer les détails du titre",
    album: "Album",
    lyrics: "Paroles",
    track: "Morceau",
  },
  likes: {
    title: "Mes favoris",
    empty:
      "Vous n'avez encore aimé aucun titre. Touchez le cœur d'un titre pour l'enregistrer ici.",
  },
  albumOrder: {
    title: "Ordonner les albums",
    intro:
      "Fais monter ou descendre un album pour choisir sa place dans la section Albums de la page d'accueil.",
    moveUp: "Monter {name}",
    moveDown: "Descendre {name}",
    hidden: "Pas encore en ligne",
    hiddenHint: "Un album sans morceau écoutable reste invisible pour le public, mais garde sa place dans l'ordre.",
    empty: "Tu n'as pas encore d'album.",
    save: "Enregistrer l'ordre",
    saving: "Enregistrement…",
    saved: "Ordre enregistré",
    reset: "Réinitialiser",
    error: "Échec de l'enregistrement",
  },
  meta: {
    homeTitle: "Bohns — Melogram",
    homeDescription:
      "La musique est ma façon la plus intuitive d'exprimer ce que les mots ne peuvent contenir.",
    profileTitle: "Profil — Bohns",
    likesTitle: "Mes favoris — Bohns",
    albumOrderTitle: "Ordonner les albums — Bohns",
  },
};
