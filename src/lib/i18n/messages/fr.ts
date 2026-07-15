import type { Messages } from "./en";

/**
 * French dictionary, typed against `Messages` so a missing or extra key fails
 * the build. Endonyms/flags live in ../config.ts, not here.
 */
export const fr: Messages = {
  nav: { home: "Accueil", top: "Top", bio: "Bio" },
  account: {
    triggerLabel: "Menu du compte",
    sectionAccount: "Compte",
    profile: "Profil",
    myLikes: "Mes favoris",
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
  },
  likes: {
    title: "Mes favoris",
    empty:
      "Vous n'avez encore aimé aucun titre. Touchez le cœur d'un titre pour l'enregistrer ici.",
  },
  meta: {
    homeTitle: "Bohns — Melogram",
    homeDescription:
      "La musique est ma façon la plus intuitive d'exprimer ce que les mots ne peuvent contenir.",
    profileTitle: "Profil — Bohns",
    likesTitle: "Mes favoris — Bohns",
  },
};
