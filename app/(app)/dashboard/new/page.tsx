"use client";

import { useEffect, useState } from "react";
import { Page, Spinner } from "@shopify/polaris";
import { useSearchParams } from "next/navigation";

import { RequestForm } from "@/components/request-form";
import { api } from "@/lib/api-client";
import type { OrgLite } from "@/lib/types";

export default function NewRequestPage() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<OrgLite[] | null>(null);

  useEffect(() => {
    api<{ orgs: OrgLite[] }>("/api/orgs")
      .then((res) => setOrgs(res.orgs))
      .catch(() => setOrgs([]));
  }, []);

  if (!orgs) {
    return (
      <Page title="New request">
        <Spinner accessibilityLabel="Loading" />
      </Page>
    );
  }

  return (
    <Page
      title="New change request"
      subtitle="One form — screenshots, references and all. We'll take it from here."
      narrowWidth
    >
      <RequestForm orgs={orgs} initialOrgId={searchParams.get("orgId") ?? undefined} />
    </Page>
  );
}
