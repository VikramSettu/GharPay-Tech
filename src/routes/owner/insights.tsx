import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerInsights } from '@/owner/pages/OwnerInsights';

export const Route = createFileRoute('/owner/insights')({
  head: () => ({ meta: [{ title: 'Insights — Owner Portal' }] }),
  component: () => <AppShell><OwnerInsights /></AppShell>,
});
