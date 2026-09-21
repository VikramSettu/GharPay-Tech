import { useMemo, useState } from "react";
import { SCENARIOS, SCENARIO_CATEGORIES } from "@/lib/os/scenarios";
import { WhyCaption } from "@/components/common/WhyCaption";
import { WHY } from "@/lib/os/why-registry";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Book } from "lucide-react";
import type { ScenarioCategory } from "@/lib/os/types";

export function ScenarioLibraryPanel() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ScenarioCategory | "all">("all");
  const filtered = useMemo(() => SCENARIOS.filter((s) => {
    if (cat !== "all" && s.category !== cat) return false;
    if (q && !(s.title + " " + s.when).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [q, cat]);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <Book className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Scenario Library</h3>
        <Badge variant="outline" className="ml-auto">{SCENARIOS.length} packs</Badge>
      </header>
      <WhyCaption {...WHY["os.scenario.run"]} />

      <div className="flex gap-2 text-xs">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={cat} onValueChange={(v) => setCat(v as ScenarioCategory | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({SCENARIOS.length})</SelectItem>
            {SCENARIO_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c} ({SCENARIOS.filter((s) => s.category === c).length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-md border p-2 text-xs space-y-1">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="capitalize">{s.category}</Badge>
              <span className="font-semibold">{s.title}</span>
              <span className="ml-auto text-muted-foreground">{s.sla}</span>
            </div>
            <div className="text-muted-foreground"><b>When:</b> {s.when}</div>
            <div className="italic">"{s.script}"</div>
            <div><b>Evidence:</b> {s.evidence.join(" · ")}</div>
            {s.revival && <div className="text-success"><b>Revival:</b> {s.revival}</div>}
            <WhyCaption why={`Pack: ${s.title}`} admin={s.why.admin} tcm={s.why.tcm} client={s.why.client} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
