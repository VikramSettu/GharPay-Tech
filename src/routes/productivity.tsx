import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductivityBoard } from "@/components/productivity/ProductivityBoard";

export const Route = createFileRoute("/productivity")({
  head: () => ({
    meta: [
      { title: "Productivity — Time per Lead | Gharpayy" },
      { name: "description", content: "See how much time each teammate spends per lead, per drawer and per call against a 120-second target." },
      { property: "og:title", content: "Productivity — Time per Lead" },
      { property: "og:description", content: "Timed lead sessions, per-person rollups and a daily productive/not-productive verdict." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ProductivityBoard />
    </AppShell>
  ),
});
