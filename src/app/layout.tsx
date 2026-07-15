import type { Metadata, Viewport } from "next";
import { Gloock, Space_Grotesk } from "next/font/google";
import { PlayerProvider } from "@/player/PlayerProvider";
import PlayerBar from "@/components/PlayerBar";
import AccountMenu from "@/components/AccountMenu";
import { LikesProvider } from "@/components/LikesProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getLocale, getMessages } from "@/lib/i18n";
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

// Matches the app shell background (`--bg`) so the mobile browser chrome and
// the PWA splash/status bar blend into the dark theme.
export const viewport: Viewport = {
  themeColor: "#11090c",
};

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return {
    title: m.meta.homeTitle,
    description: m.meta.homeDescription,
    applicationName: "Melogram",
    // Installed (Add to Home Screen) behaviour on iOS: run standalone with a
    // dark status bar and the app name under the icon.
    appleWebApp: {
      capable: true,
      title: "Melogram",
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html lang={locale} className={`${gloock.variable} ${spaceGrotesk.variable}`}>
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          <LikesProvider>
            <PlayerProvider>
              <AccountMenu />
              {children}
              <PlayerBar />
            </PlayerProvider>
          </LikesProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
