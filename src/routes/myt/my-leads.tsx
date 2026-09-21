import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import MyLeads from "@/myt/pages/MyLeads";

export const Route = createFileRoute("/myt/my-leads")({
  head: () => ({
    meta: [
      { title: "My Leads — Execution Queue | Gharpayy" },
      { name: "description", content: "Work every claimed lead: call or chat again, log the outcome, and set the mandatory next action." },
      { property: "og:title", content: "My Leads — Execution Queue" },
      { property: "og:description", content: "Claimed leads with 15-day ownership, due actions, and full touch history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell><MyLeads /></AppShell>,
});
