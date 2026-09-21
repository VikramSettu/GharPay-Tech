import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerRooms } from '@/owner/pages/OwnerRooms';

export const Route = createFileRoute('/owner/rooms')({
  head: () => ({ meta: [{ title: 'Update Rooms — Owner Portal' }] }),
  component: () => <AppShell><OwnerRooms /></AppShell>,
});
