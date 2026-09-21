import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/tower/RoleGate";
import { FastCapturePage } from "@/components/tower/FastCapturePage";

export const Route = createFileRoute("/tower/capture")({
  head: () => ({
    meta: [
      { title: "Fast Capture — Gharpayy Control Tower" },
      { name: "description", content: "Capture inbound WhatsApp conversations and assign them in seconds with duplicate detection and priority scoring." },
      { property: "og:title", content: "Fast Capture — Gharpayy Control Tower" },
      { property: "og:description", content: "Capture inbound WhatsApp conversations and assign them in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate module="overview">
      <FastCapturePage />
    </RoleGate>
  ),
});
