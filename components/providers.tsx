"use client";

import { AppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider i18n={en}>{children}</AppProvider>;
}
