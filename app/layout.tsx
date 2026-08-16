import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import "@shopify/polaris/build/esm/styles.css";
import { Providers } from "@/components/providers";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://handld.atrey.dev";
const SITE_NAME = "handld";
const SITE_TAGLINE = "Any change, handled.";
const SITE_DESCRIPTION =
  "One dedicated developer, unlimited change requests, one flat monthly retainer. Submit updates for your site and track every status in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "change requests",
    "dedicated developer",
    "web maintenance",
    "monthly retainer",
    "handld",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/brand/handld-logo.png",
        width: 512,
        height: 512,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/brand/handld-logo.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#ff4405",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
