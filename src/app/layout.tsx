import type { Metadata } from "next";
import { Gloock, Space_Grotesk } from "next/font/google";
import { PlayerProvider } from "@/player/PlayerProvider";
import "./globals.css";

const gloock = Gloock({
  variable: "--font-gloock",
  weight: "400",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bohns — Melogram",
  description:
    "Music is my most intuitive way of expressing what words can't hold.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${gloock.variable} ${spaceGrotesk.variable}`}>
      <body>
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
