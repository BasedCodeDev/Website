import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://basedcode.dev"),
  title: "BasedCode — Together, we build.",
  description: "Step inside real game and software development. Watch the decisions, ask questions, and bring useful lessons back to your own work.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "BasedCode — Together, we build.",
    description: "Watch real games and software take shape, join the conversation, and build with better context.",
    url: "https://basedcode.dev",
    siteName: "BasedCode",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "BasedCode — building games and software in public." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BasedCode — Together, we build.",
    description: "Watch real games and software take shape, join the conversation, and build with better context.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    {/* eslint-disable-next-line @next/next/no-sync-scripts */}
    <script src="/text-ripple.js" />
    {children}
  </body></html>;
}
