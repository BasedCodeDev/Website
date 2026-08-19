import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://basedcode.dev"),
  title: "BasedCode — Build it. Play it. Learn it.",
  description: "BasedCode is Seb Fehr’s creator and technology brand—building games and software in public, live on Twitch.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "BasedCode — Build it. Play it. Learn it.",
    description: "Games, software, AI experiments, and the honest decisions behind shipping real things.",
    url: "https://basedcode.dev",
    siteName: "BasedCode",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BasedCode — Build it. Play it. Learn it." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BasedCode — Build it. Play it. Learn it.",
    description: "Games, software, AI experiments, and the honest decisions behind shipping real things.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
