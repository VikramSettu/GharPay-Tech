import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import SettingsPage from "@/myt/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Gharpayy" },
      { name: "description", content: "Operational settings for matching, reminders, templates, custom fields, and scoring." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});
