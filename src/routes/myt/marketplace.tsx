import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import LeadMarketplace from "@/myt/pages/LeadMarketplace";

export const Route = createFileRoute("/myt/marketplace")({
  head: () => ({ meta: [
    { title: "Lead Marketplace — Gharpayy" },
    { name: "description", content: "Prioritized lead marketplace for claiming, guided calls, and fast follow-up scheduling." },
    { property: "og:title", content: "Lead Marketplace — Gharpayy" },
    { property: "og:description", content: "Claim urgent leads and move them through guided calls and follow-ups." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AppShell><LeadMarketplace /></AppShell>,
});
