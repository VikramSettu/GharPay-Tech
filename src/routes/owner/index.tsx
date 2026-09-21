import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerHome } from '@/owner/pages/OwnerHome';

export const Route = createFileRoute('/owner/')({
  head: () => ({ meta: [{ title: 'Owner Control Center — Gharpayy' }] }),
  component: () => <AppShell><OwnerHome /></AppShell>,
});
