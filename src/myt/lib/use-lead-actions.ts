import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppState } from '@/myt/lib/app-context';
import { CallStage, Lead, LeadTouch, TouchChannel } from '@/myt/lib/types';
import { teamMembers } from '@/myt/lib/mock-data';
import { isConnected, isIncomplete, OWNERSHIP_DAYS } from '@/myt/lib/ownership';
import type { TouchPayload } from '@/myt/components/ClaimCallSheet';

/** Shared claim → contact → log → next-action engine used by the Marketplace and My Leads. */
export function useLeadActions() {
  const { leads, setLeads, currentMemberId, setCurrentMemberId } = useAppState();
  const [active, setActive] = useState<Lead | null>(null);
  const [sheetMode, setSheetMode] = useState<'claim' | 'touch'>('claim');
  const [sheetChannel, setSheetChannel] = useState<TouchChannel>('call');
  const [sheetStage, setSheetStage] = useState<CallStage | undefined>();

  const owners = useMemo(() => teamMembers.filter(m => m.role === 'tcm' || m.role === 'flow-ops'), []);
  const actorId = currentMemberId ?? owners[0]?.id ?? 'm1';
  const actorName = teamMembers.find(m => m.id === actorId)?.name ?? 'Team';

  const openSheet = (lead: Lead, mode: 'claim' | 'touch', channel: TouchChannel = 'call', stage?: CallStage) => {
    setSheetMode(mode);
    setSheetChannel(channel);
    setSheetStage(stage);
    setActive(lead);
  };

  const claimLead = (lead: Lead, channel: TouchChannel = 'call', stage?: CallStage) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === lead.id
      ? { ...l, claimedBy: actorId, claimedAt: now, status: 'qualified' as const,
          ownershipExpiresAt: new Date(Date.now() + OWNERSHIP_DAYS * 86_400_000).toISOString() }
      : l));
    openSheet({ ...lead, claimedBy: actorId, claimedAt: now }, 'claim', channel, stage);
    toast.success(`Claimed — ${lead.name} is yours for ${OWNERSHIP_DAYS} days`, {
      description: 'It has moved out of the marketplace into My Leads.',
    });
  };

  const releaseLead = (leadId: string, quiet = false) => {
    setLeads(prev => prev.map(l => l.id === leadId
      ? { ...l, claimedBy: null, claimedAt: undefined, ownershipExpiresAt: undefined, status: 'new' as const }
      : l));
    if (!quiet) {
      toast.warning('Lead released back to the marketplace', {
        description: 'Notes and tags stay — the next person starts warmer.',
      });
    }
  };

  const completeTouch = (leadId: string, p: TouchPayload) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      const touch: LeadTouch = {
        id: `t-${Date.now()}`,
        at: now,
        by: actorId,
        byName: actorName,
        channel: p.channel,
        outcome: p.outcome,
        notes: p.notes,
        action: p.action,
        dueAt: p.dueAt,
        actionNote: p.actionNote,
        tags: p.tags,
        stage: p.stage,
        waStatus: p.waStatus,
        waLabel: p.waLabel,
        captured: p.captured,
        nextCall: p.nextCall,
      };
      const notes = p.notes.trim()
        ? [...(l.marketNotes ?? []), { id: `n-${Date.now()}`, at: now, by: actorId, byName: actorName, text: p.notes.trim() }]
        : (l.marketNotes ?? []);
      return {
        ...l,
        firstCallAt: l.firstCallAt ?? now,
        lastTouchAt: now,
        lastChannel: p.channel,
        callOutcome: p.outcome,
        callNotes: p.notes,
        waStatus: p.waStatus ?? l.waStatus,
        waLabel: p.waLabel ?? l.waLabel,
        waLabelledAt: p.waLabel ? now : l.waLabelledAt,
        discovery: { ...(l.discovery ?? {}), ...p.discovery },
        callStage: p.nextCall.stage,
        nextCall: p.nextCall,
        tags: Array.from(new Set([...(l.tags ?? []), ...p.tags])),
        marketNotes: notes,
        touches: [...(l.touches ?? []), touch],
        nextAction: { type: p.action, dueAt: p.dueAt, note: p.actionNote },
      };
    }));
    toast.success(isConnected(p.outcome) ? `Call ${p.stage} logged ✓` : 'Touch logged', {
      description: `${p.captured.length} new field${p.captured.length === 1 ? '' : 's'} captured · next call ${new Date(p.nextCall.dueAt).toLocaleString()} (Call ${p.nextCall.stage})`,
    });
  };


  const addNote = (leadId: string, text: string) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === leadId
      ? { ...l, marketNotes: [...(l.marketNotes ?? []), { id: `n-${Date.now()}`, at: now, by: actorId, byName: actorName, text }] }
      : l));
    toast.success('Note added for the whole team');
  };

  const abandon = () => {
    const current = leads.find(l => l.id === active?.id) ?? active;
    if (sheetMode === 'claim' && current && isIncomplete(current)) releaseLead(current.id);
    setActive(null);
  };

  return {
    leads, setLeads, owners, actorId, actorName, setCurrentMemberId,
    active, setActive, sheetMode, sheetChannel, sheetStage,
    openSheet, claimLead, releaseLead, completeTouch, addNote, abandon,
  };
}
