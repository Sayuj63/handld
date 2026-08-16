"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Link,
  Page,
  Spinner,
  Tabs,
  Text,
  TextField,
} from "@shopify/polaris";
import { useParams, useRouter } from "next/navigation";

import { PasswordField } from "@/components/password-field";
import { api } from "@/lib/api-client";
import { authClient, signIn, signUp } from "@/lib/auth-client";

type Invitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
  orgName: string;
};

export default function InvitePage() {
  const params = useParams<{ invitationId: string }>();
  const router = useRouter();
  const invitationId = params.invitationId;

  const { data: session } = authClient.useSession();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState(0);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ invitation: Invitation }>(`/api/invitations/${invitationId}`);
      setInvitation(res.invitation);
      setLoginEmail(res.invitation.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid invitation");
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId });
      if (res.error) {
        setActionError(res.error.message ?? "Couldn't accept the invitation");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't accept the invitation");
    } finally {
      setBusy(false);
    }
  }

  async function createAccountAndAccept() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await signUp.email({ name, email: invitation!.email, password });
      if (res.error) {
        setActionError(res.error.message ?? "Couldn't create account");
        return;
      }
      await accept();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't create account");
    } finally {
      setBusy(false);
    }
  }

  async function signInAndAccept() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await signIn.email({ email: loginEmail, password: loginPassword });
      if (res.error) {
        setActionError(res.error.message ?? "Couldn't sign in");
        return;
      }
      await accept();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Page narrowWidth>
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spinner accessibilityLabel="Loading invitation" />
        </div>
      </Page>
    );
  }

  if (error || !invitation) {
    return (
      <Page narrowWidth>
        <Box paddingBlockStart="400">
          <Card>
            <Banner tone="critical" title="Invitation unavailable">
              {error ?? "This invitation isn't valid."}{" "}
              <Link url="/" removeUnderline>
                Go home
              </Link>
            </Banner>
          </Card>
        </Box>
      </Page>
    );
  }

  const signedInWithOther = session?.user && session.user.email !== invitation.email;
  const canAccept = session?.user?.email === invitation.email;

  return (
    <Page narrowWidth>
      <Box paddingBlockStart="400">
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h1" variant="heading2xl" alignment="center">
              You&apos;re invited
            </Text>
            <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
              {invitation.orgName} has invited <strong>{invitation.email}</strong> to join
              handld{invitation.role === "owner" ? " as an organization owner" : ""}.
            </Text>
          </BlockStack>

          <Card>
            <BlockStack gap="400">
              {actionError && <Banner tone="critical">{actionError}</Banner>}

              {signedInWithOther ? (
                <Banner tone="warning" title="Signed in with a different account">
                  You&apos;re signed in as <strong>{session.user.email}</strong>. Sign out and use{" "}
                  <strong>{invitation.email}</strong> to accept this invitation.
                </Banner>
              ) : canAccept ? (
                <BlockStack gap="200">
                  <Text as="p">Signed in as <strong>{session.user.email}</strong>.</Text>
                  <Button variant="primary" size="large" fullWidth loading={busy} onClick={accept}>
                    Accept invitation
                  </Button>
                </BlockStack>
              ) : (
                <Tabs
                  tabs={[
                    { id: "create", content: "Create account" },
                    { id: "signin", content: "I already have an account" },
                  ]}
                  selected={tab}
                  onSelect={setTab}
                >
                  {tab === 0 ? (
                    <Box paddingBlockStart="400">
                      <BlockStack gap="300">
                      <TextField label="Full name" value={name} onChange={setName} autoComplete="name" />
                      <TextField
                        label="Email"
                        type="email"
                        value={invitation.email}
                        disabled
                        autoComplete="off"
                        helpText="Your invitation is tied to this email"
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
                        loading={busy}
                        disabled={!name || password.length < 8}
                        onClick={createAccountAndAccept}
                      >
                        Create account & accept invitation
                      </Button>
                      </BlockStack>
                    </Box>
                  ) : (
                    <Box paddingBlockStart="400">
                    <BlockStack gap="300">
                      <TextField
                        label="Email"
                        type="email"
                        value={loginEmail}
                        onChange={setLoginEmail}
                        autoComplete="email"
                      />
                      <PasswordField
                        value={loginPassword}
                        onChange={setLoginPassword}
                        autoComplete="current-password"
                      />
                      <Button
                        variant="primary"
                        size="large"
                        fullWidth
                        loading={busy}
                        disabled={!loginEmail || !loginPassword}
                        onClick={signInAndAccept}
                      >
                        Sign in & accept invitation
                      </Button>
                    </BlockStack>
                    </Box>
                  )}
                </Tabs>
              )}

              <InlineStack blockAlign="center" align="center">
                <Text as="span" variant="bodySm" tone="subdued">
                  Having trouble? Contact your agency — they can resend the invitation.
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Box>
    </Page>
  );
}
