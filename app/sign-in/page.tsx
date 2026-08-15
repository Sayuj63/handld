"use client";

import { useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Link,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { useRouter } from "next/navigation";

import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Couldn't sign in");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page narrowWidth>
      <Box paddingBlockStart="400">
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h1" variant="heading2xl" alignment="center">
              ChangeDesk
            </Text>
            <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
              Sign in to manage change requests for your store
            </Text>
          </BlockStack>

          <Card>
            <BlockStack gap="400">
              {error && <Banner tone="critical">{error}</Banner>}
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="you@yourstore.com"
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
              />
              <Button
                variant="primary"
                size="large"
                fullWidth
                loading={loading}
                disabled={!email || !password}
                onClick={onSubmit}
              >
                Sign in
              </Button>
              <InlineStack gap="200" blockAlign="center" align="center">
                <Text as="span" variant="bodySm">
                  New here?{" "}
                  <Link url="/sign-up" removeUnderline>
                    Create an account
                  </Link>
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Box>
    </Page>
  );
}
