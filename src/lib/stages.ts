export const STAGE_ORDER = [
  "Prospecting",
  "Sample Testing",
  "Quotation & Negotiation",
  "PO Verification",
  "Pending Approval",
  "Closed Won",
  "Closed Lost",
] as const;

export const STAGE_PROGRESS: Record<string, number> = {
  Prospecting: 8,
  "Sample Testing": 25,
  "Quotation & Negotiation": 50,
  "PO Verification": 75,
  "Pending Approval": 85,
  "Closed Won": 100,
  "Closed Lost": 100,
};

export const STAGE_COLORS: Record<string, string> = {
  Prospecting: "text-slate-500",
  "Sample Testing": "text-sky-600",
  "Quotation & Negotiation": "text-corporate",
  "PO Verification": "text-warning",
  "Pending Approval": "text-violet-600",
  "Closed Won": "text-agro",
  "Closed Lost": "text-danger",
};

export const STAGE_BAR_COLORS: Record<string, string> = {
  Prospecting: "bg-slate-400",
  "Sample Testing": "bg-sky-500",
  "Quotation & Negotiation": "bg-corporate",
  "PO Verification": "bg-warning",
  "Pending Approval": "bg-violet-500",
  "Closed Won": "bg-agro",
  "Closed Lost": "bg-danger",
};