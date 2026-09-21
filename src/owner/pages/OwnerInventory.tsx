import { useOwner } from "../owner-context";
import { Building2, MapPin } from "lucide-react";

// Owner sees ONLY: their property's masked display name + area / locality.
// No prices, no manager contacts, no scripts, no internal tools — that data
// is reserved for HR / Flow Ops / TCM in the Supply Hub.
export function OwnerInventory() {
  const { owners, currentOwnerId, properties } = useOwner();
  const owner = owners.find((o) => o.id === currentOwnerId) ?? owners[0];
  const myProps = properties.filter((p) => owner.propertyIds.includes(p.id));

  // Mask: hide the actual building name from the owner view by showing the
  // brand/codename only (their existing property name in our network).
  const masked = (name: string) => {
    if (!name) return "Property";
    const t = name.trim();
    if (t.length <= 4) return t.toUpperCase();
    return `${t.slice(0, 2).toUpperCase()}•••${t.slice(-2).toUpperCase()}`;
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-1">Owner Portal</div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">My Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your properties listed in the Gharpayy network. Names are masked for privacy when shared externally.
          Pricing, occupancy and pitch tools are managed by the Gharpayy team.
        </p>
      </header>

      {myProps.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No properties linked to this owner profile yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProps.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-warning/15 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Listed as</div>
                  <h3 className="font-display text-lg font-semibold truncate">{masked(p.name)}</h3>
                  <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="truncate">{p.area}{p.address ? ` · ${p.address}` : ""}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <div className="uppercase tracking-wider text-muted-foreground">Zone</div>
                  <div className="text-xs mt-0.5">{p.area || "—"}</div>
                </div>
                <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <div className="uppercase tracking-wider text-muted-foreground">Internal ID</div>
                  <div className="text-xs mt-0.5 font-mono">{p.id}</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground italic">
                For pricing, occupancy or visit details, contact your Gharpayy account manager.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
