import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerVisits } from '@/owner/pages/OwnerVisits';

export const Route = createFileRoute('/owner/visits')({
  head: () => ({ meta: [{ title: 'Visits — Owner Portal' }] }),
  component: () => <AppShell><OwnerVisits /></AppShell>,
});
