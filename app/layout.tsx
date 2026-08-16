import type { Metadata } from "next";

import "@/app/globals.css";
import "@shopify/polaris/build/esm/styles.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "handld",
  description: "Client change request portal for Shopify stores",
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
