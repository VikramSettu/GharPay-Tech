import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export function Field({
  label, hint, children, className,
}: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  label, value, onChange, placeholder, hint, type = "text", className,
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; hint?: string; type?: string; className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
    </Field>
  );
}

export function NumField({
  label, value, onChange, hint, step, className,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string; step?: string; className?: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-9 text-sm tabular-nums"
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label, value, onChange, options, hint, className,
}: { label: string; value: T; onChange: (v: T) => void; options: readonly T[] | { value: T; label: string }[]; hint?: string; className?: string }) {
  const opts = (options as unknown[]).map((o) =>
    typeof o === "string" ? { value: o as T, label: o } : (o as { value: T; label: string }),
  );
  return (
    <Field label={label} hint={hint} className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function ToggleField({
  label, value, onChange, hint,
}: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export function AreaField({
  label, value, onChange, placeholder, hint,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <Textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="min-h-[64px] text-sm" />
    </Field>
  );
}

/** Editable list of short strings — used for USPs, why / why not, notes. */
export function ListEditor({
  label, items, onChange, placeholder, hint,
}: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [entry, setEntry] = useState("");
  const add = () => {
    const v = entry.trim();
    if (!v) return;
    onChange([...items, v]);
    setEntry("");
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <Input
          value={entry}
          placeholder={placeholder}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs">
              <span>{it}</span>
              <button
                type="button"
                aria-label={`Remove ${it}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

export function StepShell({
  title, hint, children, aside,
}: { title: string; hint: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {aside}
      {children}
    </div>
  );
}
