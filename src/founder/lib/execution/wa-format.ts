// Handlebars-lite {{key}} replacement for WhatsApp templates.
// Missing keys render as "—" so the message never breaks.

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "number") return v.toLocaleString("en-IN");
    return String(v);
  });
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

/** Where auto reports get sent. Admin can set the reporting number once. */
const WA_TARGET_KEY = "gp_wa_report_number";

export function getWaTarget(): string {
  if (typeof window === "undefined") return "";
  return (window.localStorage.getItem(WA_TARGET_KEY) || "").replace(/[^\d]/g, "");
}

export function setWaTarget(num: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WA_TARGET_KEY, (num || "").replace(/[^\d]/g, ""));
}

/**
 * Deep link that opens WhatsApp with the message already typed out.
 * When a reporting number is configured it opens that chat directly, so the
 * person only taps send — one click, no copy-paste.
 */
export function waDeepLink(text: string, to?: string): string {
  const num = (to ?? getWaTarget()).replace(/[^\d]/g, "");
  const q = `?text=${encodeURIComponent(text)}`;
  return num ? `https://wa.me/${num}${q}` : `https://wa.me/${q}`;
}