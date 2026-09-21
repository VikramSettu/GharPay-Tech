import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { FieldDef } from "@/founder/lib/execution/field-library";
import { Minus, Plus } from "lucide-react";

interface Props {
  field: FieldDef;
  value: unknown;
  target?: number;
  onChange: (v: unknown) => void;
  required?: boolean;
}

export function FieldRenderer({ field, value, target, onChange, required }: Props) {
  const label = (
    <Label className="text-xs flex items-center gap-2 mb-1">
      {field.label}
      {required && <span className="text-destructive">*</span>}
      {target !== undefined && <Badge variant="outline" className="text-[10px] font-mono">goal {target}</Badge>}
    </Label>
  );

  switch (field.type) {
    case "text":
      return (
        <div>
          {label}
          <Input value={(value as string) || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "longtext":
      return (
        <div>
          {label}
          <Textarea rows={2} value={(value as string) || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "number":
    case "currency":
    case "percent":
      return (
        <div>
          {label}
          <Input type="number" min={0} value={(value as number) ?? ""} onChange={(e) => onChange(Number(e.target.value) || 0)} className="font-mono" />
        </div>
      );
    case "time":
      return (
        <div>
          {label}
          <Input type="time" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "date":
      return (
        <div>
          {label}
          <Input type="date" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "energy": {
      const v = (value as number) || 3;
      return (
        <div>
          {label}
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map((n) => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`p-2 rounded-md border text-xs ${v === n ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                {["Low","OK","Good","Peak"][n - 1]}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "sentiment": {
      const v = (value as string) || "green";
      return (
        <div>
          {label}
          <div className="flex gap-2">
            {["green","amber","red"].map((s) => (
              <button key={s} type="button" onClick={() => onChange(s)}
                className={`flex-1 py-1.5 rounded text-xs capitalize border ${v === s ? "border-primary bg-primary/10" : ""}`}>{s}</button>
            ))}
          </div>
        </div>
      );
    }
    case "risk":
      return (
        <div>
          {label}
          <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={(value as string) || "green"} onChange={(e) => onChange(e.target.value)}>
            <option value="green">Green · on track</option>
            <option value="amber">Amber · attention</option>
            <option value="red">Red · at risk</option>
          </select>
        </div>
      );
    case "select":
      return (
        <div>
          {label}
          <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    case "multiselect": {
      const arr = (value as string[]) || [];
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((o) => {
              const on = arr.includes(o);
              return (
                <button key={o} type="button"
                  onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
                  className={`px-2 py-1 rounded-md border text-xs ${on ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case "kpiChip": {
      const n = (value as number) || 0;
      const pct = target ? Math.min(100, Math.round((n / target) * 100)) : 0;
      return (
        <div className="rounded-lg border bg-background p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{field.label}</span>
            <span className="text-xs font-mono">{n}{target ? `/${target}` : ""}</span>
          </div>
          {target ? <div className="h-1 rounded bg-muted overflow-hidden mb-1"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div> : null}
          <div className="flex gap-1">
            <button type="button" onClick={() => onChange(Math.max(0, n - 1))} className="flex-1 text-xs py-1 rounded bg-muted hover:bg-muted/80"><Minus className="h-3 w-3 mx-auto" /></button>
            <button type="button" onClick={() => onChange(n + 1)} className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:opacity-90 font-medium"><Plus className="h-3 w-3 mx-auto" /></button>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}