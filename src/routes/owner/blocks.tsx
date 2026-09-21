import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { OwnerBlocks } from '@/owner/pages/OwnerBlocks';

export const Route = createFileRoute('/owner/blocks')({
  head: () => ({ meta: [{ title: 'Block Requests — Owner Portal' }] }),
  component: () => <AppShell><OwnerBlocks /></AppShell>,
});
