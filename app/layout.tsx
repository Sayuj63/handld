import type { Metadata } from "next";

import "@/app/globals.css";
import "@shopify/polaris/build/esm/styles.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "handld — Any change, handled.",
  description:
    "Unlimited change requests for your site, tracked in one place. One dedicated developer, one flat monthly retainer.",
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
