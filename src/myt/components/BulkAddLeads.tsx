import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { parseBulkLeads } from '@/myt/lib/ownership';
import { Lead } from '@/myt/lib/types';

export function BulkAddLeads({ onAdd, addedBy, addedByName }: {
  onAdd: (leads: Lead[]) => void;
  addedBy: string;
  addedByName: string;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const { parsed, errors } = parseBulkLeads(raw);

  const commit = () => {
    const now = Date.now();
    const leads: Lead[] = parsed.map((p, i) => ({
      id: `bulk-${now}-${i}`,
      name: p.name,
      phone: p.phone,
      area: p.area,
      budget: p.budget,
      moveInDate: p.moveInDate,
      dateConfirmed: false,
      status: 'new',
      mytQualified: false,
      addedBy,
      addedByName,
      createdAt: new Date().toISOString(),
      notes: 'Bulk added',
      claimedBy: null,
    }));
    onAdd(leads);
    setRaw('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
          <Upload className="h-3 w-3" /> Bulk add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Bulk add leads</DialogTitle>
          <DialogDescription className="text-xs">
            Paste one lead per line — <code>Name, Phone, Area, Budget, YYYY-MM-DD</code>. 30+ lines at once is fine.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'Rahul Sharma, 9876543210, Kondapur, 9000, 2026-08-20\nPriya N, 9876543211, Gachibowli, 12000'}
          className="font-mono text-xs"
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {parsed.length} valid{errors.length > 0 && ` · ${errors.length} skipped`}
          </span>
          <Button size="sm" disabled={parsed.length === 0} onClick={commit}>
            Add {parsed.length} lead{parsed.length === 1 ? '' : 's'}
          </Button>
        </div>
        {errors.length > 0 && (
          <div className="max-h-24 overflow-auto text-[11px] text-danger space-y-0.5">
            {errors.slice(0, 8).map((e) => <div key={e}>{e}</div>)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
