import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InterventionQueue } from "@/components/workflow/InterventionQueue";

export const Route = createFileRoute("/tower/interventions")({
  head: () => ({
    meta: [
      { title: "Intervention Queue — Workflow Guarantee" },
      { name: "description", content: "Every broken workflow guarantee ranked by severity, with direct fixes for owner, next action and SLA breaches." },
      { property: "og:title", content: "Intervention Queue — Workflow Guarantee" },
      { property: "og:description", content: "Fix broken lead movement from one screen: assign, call, schedule, quote, block or escalate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><InterventionQueue /></AppShell>,
});
