import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectLeadForm } from "@/components/leads/DirectLeadForm";
import { ReassignConsole } from "@/components/leads/ReassignConsole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIdentityStore } from "@/lib/lead-identity/store";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/leads/add")({
  head: () => ({
    meta: [
      { title: "Add Lead — Gharpayy" },
      { name: "description", content: "Direct entry with live dedup, zone detection, and one-click ownership." },
    ],
  }),
  component: AddLeadPage,
});

function AddLeadPage() {
  const totalLeads = useIdentityStore((s) => s.leads.length);
  return (
    <AppShell>
      <div className="space-y-4 max-w-3xl mx-auto">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Add a lead</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Real-time dedup against {totalLeads} unified leads
            </p>
          </div>
        </header>

        <Tabs defaultValue="single" className="space-y-4">
          <TabsList>
            <TabsTrigger value="single">Single lead</TabsTrigger>
            <TabsTrigger value="requests">Reassign & duplicates</TabsTrigger>
          </TabsList>
          <TabsContent value="single"><DirectLeadForm /></TabsContent>
          <TabsContent value="requests"><ReassignConsole /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
