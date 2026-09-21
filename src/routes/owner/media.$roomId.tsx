import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerMedia } from '@/owner/pages/OwnerMedia';

export const Route = createFileRoute('/owner/media/$roomId')({
  head: () => ({ meta: [{ title: 'Room Media — Owner Portal' }] }),
  component: () => <AppShell><OwnerMedia /></AppShell>,
});
