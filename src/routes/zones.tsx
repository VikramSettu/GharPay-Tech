import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ZoneRoleBoard } from "@/components/zones/ZoneRoleBoard";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Zone Roles & Coverage — Gharpayy" },
      { name: "description", content: "Six-role zone model with backup matrix, function catalogue, and pod coverage." },
    ],
  }),
  component: ZonesPage,
});

function ZonesPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-4">
        <header>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Zone Roles & Coverage</h1>
          <p className="text-sm text-muted-foreground">
            Six people per zone, each owning one primary function and cross-trained on one backup. If leads are slow, jump into the zone pool and close what's stuck.
          </p>
        </header>
        <ZoneRoleBoard />
      </div>
    </AppShell>
  );
}
