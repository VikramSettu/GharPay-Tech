/**
 * PERSON LINK — click any name anywhere in /admin and that person becomes the
 * focused person for every tab, with their 360 sheet opening straight away.
 * Falls back to plain text when the person isn't in the CRM roster.
 */
import { useAdminFocusOptional } from "@/founder/lib/admin-focus";

export function PersonLink({ name, className = "" }: { name: string; className?: string }) {
  const f = useAdminFocusOptional();
  if (!f) return <span className={className}>{name}</span>;
  const active = f.focus?.name.toLowerCase() === name.trim().toLowerCase();
  return (
    <button
      type="button"
      title="Focus this person across every admin tab"
      onClick={(e) => { e.stopPropagation(); f.focusByName(name); }}
      className={`text-left hover:text-primary hover:underline ${active ? "text-primary" : ""} ${className}`}
    >
      {name}
    </button>
  );
}
