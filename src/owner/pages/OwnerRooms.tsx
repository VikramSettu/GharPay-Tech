import { useMemo, useState } from 'react';
import { useOwner } from '@/owner/owner-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Lock, Camera, Check, AlertCircle, Building2, Plus, Sparkles, Eye, Calendar,
  Zap, IndianRupee,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { OwnerRoomStatus, RoomStatusKind } from '@/owner/types';
import { Countdown } from '@/owner/components/Countdown';
import { roomHeroClass } from '@/owner/components/room-hero';
import { cn } from '@/lib/utils';

export function OwnerRooms() {
  const {
    currentOwnerId, owners, properties, rooms, roomStatuses,
    updateRoomStatus, markRoomVerified, toggleDedicated, bulkVerify, bulkRentDelta,
    addProperty, addRoom, media, truth, blocks,
  } = useOwner();

  const owner = owners.find((o) => o.id === currentOwnerId) ?? owners[0];
  const myProps = useMemo(
    () => properties.filter((p) => owner.propertyIds.includes(p.id)),
    [properties, owner.propertyIds]
  );

  // Dialogs
  const [editing, setEditing] = useState<OwnerRoomStatus | null>(null);
  const [editForm, setEditForm] = useState({
    kind: 'occupied' as RoomStatusKind,
    vacatingDate: '',
    rentConfirmed: '',
    floorPrice: '',
    notes: '',
  });

  const [addPropOpen, setAddPropOpen] = useState(false);
  const [propForm, setPropForm] = useState({ name: '', area: '' });

  const [addRoomFor, setAddRoomFor] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({
    type: 'double' as 'single' | 'double' | 'triple' | 'studio',
    bedsTotal: '2',
    price: '',
    floorPrice: '',
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'verify' | 'rent_down_500' | 'rent_up_500'>('verify');

  // Handlers
  const openEdit = (s: OwnerRoomStatus) => {
    setEditForm({
      kind: s.kind,
      vacatingDate: s.vacatingDate ?? '',
      rentConfirmed: s.rentConfirmed?.toString() ?? '',
      floorPrice: s.floorPrice?.toString() ?? '',
      notes: s.notes ?? '',
    });
    setEditing(s);
  };

  const submitEdit = () => {
    if (!editing) return;
    const needsVac = editForm.kind === 'vacating';
    if (needsVac && (!editForm.vacatingDate || !editForm.rentConfirmed)) {
      toast.error('Vacating needs date + rent');
      return;
    }
    updateRoomStatus(editing.roomId, {
      kind: editForm.kind,
      vacatingDate: needsVac ? editForm.vacatingDate : undefined,
      rentConfirmed: editForm.rentConfirmed ? Number(editForm.rentConfirmed) : undefined,
      floorPrice: editForm.floorPrice ? Number(editForm.floorPrice) : undefined,
      notes: editForm.notes || undefined,
    });
    toast.success(`Room confirmed`, { description: 'Synced with the team in real time.' });
    setEditing(null);
  };

  const submitAddProperty = () => {
    if (!propForm.name || !propForm.area) {
      toast.error('Name and area required');
      return;
    }
    addProperty(propForm);
    toast.success('Property added', { description: propForm.name });
    setPropForm({ name: '', area: '' });
    setAddPropOpen(false);
  };

  const submitAddRoom = () => {
    if (!addRoomFor || !roomForm.price) {
      toast.error('Property and price required');
      return;
    }
    addRoom({
      propertyId: addRoomFor,
      type: roomForm.type,
      bedsTotal: Number(roomForm.bedsTotal) || 1,
      price: Number(roomForm.price),
      floorPrice: roomForm.floorPrice ? Number(roomForm.floorPrice) : undefined,
    });
    toast.success(`Room added`, { description: 'Now visible to your sales team.' });
    setRoomForm({ type: 'double', bedsTotal: '2', price: '', floorPrice: '' });
    setAddRoomFor(null);
  };

  const submitBulk = () => {
    if (!bulkSelected.length) { toast.error('Select at least one room'); return; }
    if (bulkAction === 'verify') bulkVerify(bulkSelected);
    if (bulkAction === 'rent_down_500') bulkRentDelta(bulkSelected, -500);
    if (bulkAction === 'rent_up_500') bulkRentDelta(bulkSelected, 500);
    toast.success(`Applied to ${bulkSelected.length} rooms`);
    setBulkSelected([]);
    setBulkOpen(false);
  };

  return (
    <div className="space-y-5 pb-32">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight">Update rooms · per-room precision</h1>
          <p className="text-sm text-muted-foreground">No bulk shortcuts. Each room confirmed individually before 11 AM.</p>
        </div>
        <div className="hidden md:flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <Zap className="h-3.5 w-3.5 mr-1" /> Bulk actions
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddPropOpen(true)}>
            <Building2 className="h-3.5 w-3.5 mr-1" /> Add property
          </Button>
          <Button size="sm" onClick={() => setAddRoomFor(myProps[0]?.id ?? null)} disabled={!myProps.length}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add room
          </Button>
        </div>
      </header>

      {truth.phase === 'locked' && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-destructive" /> Window closed. Updates still allowed but rooms missed today's truth check.
        </div>
      )}

      {myProps.map((property) => {
        const propStatuses = roomStatuses.filter((s) => s.propertyId === property.id);
        const propRooms = rooms.filter((r) => r.propertyId === property.id);
        const sellable = propStatuses.filter((s) => s.verifiedToday && !s.lockedUnsellable && (s.kind === 'vacant' || s.kind === 'vacating')).length;
        return (
          <section key={property.id} className="space-y-3">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/30 grid place-items-center">
                  <Building2 className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold">{property.name}</h2>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {property.area} · {propRooms.length} rooms · {sellable} sellable
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddRoomFor(property.id)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add room
              </Button>
            </div>

            {propStatuses.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
                No rooms yet at {property.name}.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {propStatuses.map((s) => {
                const r = propRooms.find((x) => x.id === s.roomId);
                const m = media.find((x) => x.roomId === s.roomId);
                const hasMedia = !!m && m.photos.length >= 3 && !!m.videoUrl;
                const block = blocks.find((b) => b.roomId === s.roomId && b.state === 'pending');
                const tone = s.lockedUnsellable ? 'border-destructive/40' : s.verifiedToday ? 'border-success/30' : 'border-warning/40';
                return (
                  <div key={s.roomId} className={cn('rounded-xl border bg-card overflow-hidden flex flex-col', tone)}>
                    {/* Hero strip */}
                    <div className={cn('h-20 relative flex items-end p-3', roomHeroClass(s.roomId))}>
                      {s.isDedicated && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 text-foreground px-2 py-0.5 text-[10px] font-mono font-bold uppercase shadow-sm">
                          <Sparkles className="h-2.5 w-2.5" /> Dedicated
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-white/90 text-foreground',
                        )}>
                          {s.kind}
                        </span>
                      </div>
                      <div className="text-white">
                        <div className="font-mono text-[9px] opacity-80 tracking-widest uppercase">Room</div>
                        <div className="text-lg font-display font-semibold leading-none capitalize">{r?.type ?? '—'}</div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-display font-semibold tabular-nums">
                          ₹{(s.rentConfirmed ?? r?.currentPrice ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/mo</span>
                        {s.floorPrice && (
                          <span className="ml-auto text-[10px] text-muted-foreground inline-flex items-center gap-0.5" title="Your floor price (private)">
                            <IndianRupee className="h-2.5 w-2.5" />floor {s.floorPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono">
                          {r?.bedsTotal ?? 0} bed{r && r.bedsTotal > 1 ? 's' : ''}
                        </span>
                        {(s.views ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono">
                            <Eye className="h-2.5 w-2.5" /> {s.views} views
                          </span>
                        )}
                        {block && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 text-warning-foreground border border-warning/30 px-1.5 py-0.5 font-mono uppercase">
                            <Lock className="h-2.5 w-2.5" /> Block req
                          </span>
                        )}
                        {!hasMedia && s.kind === 'vacant' && (
                          <Link
                            to="/owner/media/$roomId"
                            params={{ roomId: s.roomId }}
                            className="inline-flex items-center gap-1 rounded-md bg-info/10 text-info border border-info/30 px-1.5 py-0.5 font-mono uppercase"
                          >
                            <Camera className="h-2.5 w-2.5" /> Add media
                          </Link>
                        )}
                      </div>

                      {s.vacatingDate && (
                        <div className="text-[11px] text-warning-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Vacant {s.vacatingDate}
                        </div>
                      )}

                      {s.lockedUnsellable && (
                        <div className="text-[11px] text-destructive font-medium">⚠ Auto-locked — not verified by 11 AM</div>
                      )}

                      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-2">
                        {s.verifiedToday && !s.lockedUnsellable && <span className="text-success inline-flex items-center gap-1"><Check className="h-3 w-3" /> verified today</span>}
                        {!s.verifiedToday && !s.lockedUnsellable && <span className="inline-flex items-center gap-1 text-warning-foreground"><AlertCircle className="h-3 w-3" /> not verified</span>}
                      </div>

                      <div className="mt-auto pt-1 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <Switch
                            checked={!!s.isDedicated}
                            onCheckedChange={() => {
                              toggleDedicated(s.roomId);
                              toast(s.isDedicated ? 'Removed from dedicated' : 'Added to dedicated supply');
                            }}
                            disabled={s.kind === 'occupied'}
                          />
                          <span className="text-[10px] text-muted-foreground">Dedicated</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => markRoomVerified(s.roomId)}>No change</Button>
                        <Button size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      </div>

                      {block && (
                        <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-1">
                          Block expires in <Countdown to={block.expiresAt} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Mobile floating bar */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
        <div className="rounded-xl border border-border bg-card p-2 flex gap-2 shadow-lg">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setBulkOpen(true)}>
            <Zap className="h-4 w-4 mr-1" /> Bulk
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setAddPropOpen(true)}>
            <Building2 className="h-4 w-4 mr-1" /> Property
          </Button>
          <Button size="sm" className="flex-1" onClick={() => setAddRoomFor(myProps[0]?.id ?? null)} disabled={!myProps.length}>
            <Plus className="h-4 w-4 mr-1" /> Room
          </Button>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm room</DialogTitle>
            <DialogDescription>This is the source of truth. Sales sees this in seconds.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Status</Label>
              <Select value={editForm.kind} onValueChange={(v) => setEditForm((f) => ({ ...f, kind: v as RoomStatusKind }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacating">Vacating (date + rent)</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Confirmed rent ₹</Label>
                <Input type="number" value={editForm.rentConfirmed} onChange={(e) => setEditForm((f) => ({ ...f, rentConfirmed: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Floor (private) ₹</Label>
                <Input type="number" value={editForm.floorPrice} onChange={(e) => setEditForm((f) => ({ ...f, floorPrice: e.target.value }))} />
              </div>
            </div>
            {editForm.kind === 'vacating' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Vacating date</Label>
                <Input type="date" value={editForm.vacatingDate} onChange={(e) => setEditForm((f) => ({ ...f, vacatingDate: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Notes</Label>
              <Input value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitEdit}>Save & verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD PROPERTY DIALOG */}
      <Dialog open={addPropOpen} onOpenChange={setAddPropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add property</DialogTitle>
            <DialogDescription>Add a new building under your portfolio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Property name</Label>
              <Input value={propForm.name} onChange={(e) => setPropForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sunshine Residency" />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <Input value={propForm.area} onChange={(e) => setPropForm((f) => ({ ...f, area: e.target.value }))} placeholder="Koramangala 5th Block" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddPropOpen(false)}>Cancel</Button>
            <Button onClick={submitAddProperty}>Add property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD ROOM DIALOG */}
      <Dialog open={!!addRoomFor} onOpenChange={(o) => !o && setAddRoomFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add room</DialogTitle>
            <DialogDescription>{properties.find((p) => p.id === addRoomFor)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Room type</Label>
                <Select value={roomForm.type} onValueChange={(v) => setRoomForm((f) => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Beds total</Label>
                <Input type="number" value={roomForm.bedsTotal} onChange={(e) => setRoomForm((f) => ({ ...f, bedsTotal: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Expected rent ₹</Label>
                <Input type="number" value={roomForm.price} onChange={(e) => setRoomForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Floor price ₹ (private)</Label>
                <Input type="number" value={roomForm.floorPrice} onChange={(e) => setRoomForm((f) => ({ ...f, floorPrice: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddRoomFor(null)}>Cancel</Button>
            <Button onClick={submitAddRoom}>Add room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK ACTIONS DIALOG */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk actions</DialogTitle>
            <DialogDescription>Apply the same change to many rooms — emergency lever only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verify">Mark verified · no change</SelectItem>
                  <SelectItem value="rent_down_500">Drop rent ₹500</SelectItem>
                  <SelectItem value="rent_up_500">Raise rent ₹500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pick rooms ({bulkSelected.length} selected)</Label>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {roomStatuses.filter((s) => s.ownerId === owner.id).map((s) => {
                  const r = rooms.find((x) => x.id === s.roomId);
                  const p = properties.find((x) => x.id === s.propertyId);
                  const checked = bulkSelected.includes(s.roomId);
                  return (
                    <label key={s.roomId} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        setBulkSelected((prev) => v ? [...prev, s.roomId] : prev.filter((x) => x !== s.roomId));
                      }} />
                      <span className="flex-1 truncate">{p?.name} · {r?.type} ({r?.bedsTotal}b)</span>
                      <span className="font-mono text-muted-foreground">₹{s.rentConfirmed?.toLocaleString() ?? '—'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={submitBulk}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
