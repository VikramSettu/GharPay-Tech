// Closed-Loop Event Bus — single source of truth for cross-module events.
// Owner ↔ Team ↔ HR all subscribe here. No page mutates state in isolation.

export type GlueEvent =
  // Owner events
  | { type: 'owner.room.updated'; roomId: string; propertyId: string; status: string; ownerId: string }
  | { type: 'owner.room.locked'; roomId: string; propertyId: string; ownerId: string; reason: string }
  | { type: 'owner.media.uploaded'; roomId: string; ownerId: string; expiresAt: string }
  | { type: 'owner.media.expired'; roomId: string; ownerId: string }
  | { type: 'owner.block.approved'; blockId: string; roomId: string; leadId: string }
  | { type: 'owner.block.rejected'; blockId: string; roomId: string; leadId: string }
  | { type: 'owner.compliance.scored'; ownerId: string; score: number; tier: string }
  // Team events
  | { type: 'team.lead.pitched'; leadId: string; roomId?: string; tcmId: string }
  | { type: 'team.visit.scheduled'; tourId: string; leadId: string; roomId?: string; ownerId?: string }
  | { type: 'team.visit.started'; tourId: string; leadId: string }
  | { type: 'team.visit.ended'; tourId: string; leadId: string; ownerId?: string }
  | { type: 'team.block.requested'; blockId: string; roomId: string; leadId: string; ownerId: string }
  | { type: 'team.task.created'; taskId: string; roomId: string; reason: string }
  | { type: 'team.activation.required'; roomId: string; expiresAt: string }
  // TCM events
  | { type: 'tcm.report.required'; tourId: string; deadline: string }
  | { type: 'tcm.report.filed'; tourId: string; objection?: string; ownerId?: string }
  // System
  | { type: 'system.daily.truth.warning'; ownerIds: string[] }
  | { type: 'system.daily.truth.locked'; ownerIds: string[] }
  | { type: 'tour.confirmation.sent'; tourId: string; channel: string }
  | { type: 'tour.reminder.sent'; tourId: string; kind: string };

type Listener = (e: GlueEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();
  private buffer: GlueEvent[] = [];
  private maxBuffer = 200;

  publish(e: GlueEvent) {
    this.buffer.push(e);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
    this.listeners.forEach((l) => {
      try { l(e); } catch (err) { console.error('[event-bus] listener error', err); }
    });
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  recent(filter?: (e: GlueEvent) => boolean, limit = 50): GlueEvent[] {
    const list = filter ? this.buffer.filter(filter) : this.buffer;
    return list.slice(-limit).reverse();
  }
}

export const glueBus = new EventBus();
