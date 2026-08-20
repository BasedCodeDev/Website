import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://basedcode.dev"),
  title: "BasedCode — Build it. Play it. Learn it.",
  description: "Games, software, and AI experiments built in public—see the decisions, learn from the mess, and build alongside us.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "BasedCode — Build it. Play it. Learn it.",
    description: "Watch real games and software take shape, join the conversation, and build with better context.",
    url: "https://basedcode.dev",
    siteName: "BasedCode",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BasedCode — building games and software in public." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BasedCode — Build it. Play it. Learn it.",
    description: "Watch real games and software take shape, join the conversation, and build with better context.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
