import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OwnerInventory } from "@/owner/pages/OwnerInventory";

export const Route = createFileRoute("/owner/inventory")({
  head: () => ({ meta: [{ title: "My Inventory — Gharpayy Owner" }] }),
  component: () => <AppShell><OwnerInventory /></AppShell>,
});
