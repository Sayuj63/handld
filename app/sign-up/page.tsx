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

import { PasswordField } from "@/components/password-field";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await signUp.email({ name, email, password });
      if (res.error) {
        setError(res.error.message ?? "Couldn't create account");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create account");
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
              Create your account
            </Text>
            <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
              Usually you&apos;ll have received an invitation from your agency
            </Text>
          </BlockStack>

          <Card>
            <BlockStack gap="400">
              {error && <Banner tone="critical">{error}</Banner>}
              <TextField label="Name" value={name} onChange={setName} autoComplete="name" />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@yourstore.com"
              />
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                helpText="At least 8 characters"
              />
              <Button
                variant="primary"
                size="large"
                fullWidth
                loading={loading}
                disabled={!name || !email || password.length < 8}
                onClick={onSubmit}
              >
                Create account
              </Button>
              <InlineStack gap="200" blockAlign="center" align="center">
                <Text as="span" variant="bodySm">
                  Already have an account?{" "}
                  <Link url="/sign-in" removeUnderline>
                    Sign in
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
