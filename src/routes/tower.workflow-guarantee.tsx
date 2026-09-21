import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { WorkflowGuaranteeDashboard } from "@/components/workflow/WorkflowGuaranteeDashboard";

export const Route = createFileRoute("/tower/workflow-guarantee")({
  head: () => ({
    meta: [
      { title: "Workflow Guarantee — Control Tower" },
      { name: "description", content: "Live guarantee score: is every lead owned, moving, and inside SLA? Function and person level flow in one view." },
      { property: "og:title", content: "Workflow Guarantee — Control Tower" },
      { property: "og:description", content: "The operating layer above the CRM: violations, person flow grid and projected end of day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell><WorkflowGuaranteeDashboard /></AppShell>,
});
