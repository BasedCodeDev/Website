import type { Metadata } from "next";
import { MediaKitPage } from "./MediaKitPage";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Media Kit — BasedCode",
  description: "Official BasedCode profile pictures, editorial photography, brand references, and theme music.",
  alternates: { canonical: "/media-kit" },
  openGraph: {
    title: "Media Kit — BasedCode",
    description: "Profile pictures, editorial photography, and music for BasedCode coverage.",
    url: "https://basedcode.dev/media-kit",
    siteName: "BasedCode",
    type: "website",
    images: [{
      url: "/media-kit/previews/seb-fehr-profile-purple.webp",
      width: 1448,
      height: 1086,
      alt: "Seb Fehr against the BasedCode purple background.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Media Kit — BasedCode",
    description: "Official BasedCode profile pictures, editorial photography, and theme music.",
    images: ["/media-kit/previews/seb-fehr-profile-purple.webp"],
  },
};

export default function MediaKit() {
  return <MediaKitPage />;
}
