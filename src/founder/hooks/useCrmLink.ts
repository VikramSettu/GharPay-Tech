import { useEffect, useState } from "react";
import { crmSnapshot, watchCrm } from "@/founder/lib/crm-link";

/**
 * Keeps the Founder Admin console attached to the live CRM store: any lead,
 * tour, follow-up or booking change re-syncs the roster and re-renders.
 */
export function useCrmLink() {
  const [, bump] = useState(0);
  useEffect(() => watchCrm(() => bump((n) => n + 1)), []);
  const snap = crmSnapshot();
  return {
    leads: snap.leads.length,
    tours: snap.tours.length,
    bookings: snap.bookings.length,
    people: snap.tcms.length,
  };
}
