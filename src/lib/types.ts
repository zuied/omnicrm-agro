import type { Role } from "./auth";

export interface SessionUser {
  id: number;
  full_name: string;
  role: Role;
  email: string;
  phone?: string;
  region?: string;
}

export interface ApiUser {
  id: number;
  full_name: string;
  role: Role;
  email: string;
  phone?: string;
  region?: string;
  created_at?: string;
  is_active?: number;
}

// Stage pipeline PRD (dipetakan ke kolom/mobile tab)
export const PIPELINE_STAGES = [
  "Prospecting",
  "Sample Testing",
  "Quotation & Negotiation",
  "PO Verification",
  "Pending Approval",
  "Closed Won",
  "Closed Lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Kolom Kanban desktop - hanya stage aktif (Closed Lost disembunyikan dari board). */
export const KANBAN_COLUMNS: PipelineStage[] = [
  "Sample Testing",
  "Quotation & Negotiation",
  "PO Verification",
  "Pending Approval",
  "Closed Won",
];

/** Tab mobile sesuai mockup Figma. */
export interface MobileTab {
  id: string;
  label: string;
  stages: PipelineStage[];
}

export const MOBILE_TABS: MobileTab[] = [
  { id: "testing", label: "Testing", stages: ["Prospecting", "Sample Testing"] },
  { id: "negosiasi", label: "Negosiasi", stages: ["Quotation & Negotiation", "PO Verification"] },
  { id: "pending", label: "Pending", stages: ["Pending Approval"] },
  { id: "selesai", label: "Selesai", stages: ["Closed Won"] },
];

export function tabOfStage(stage: string): string {
  const t = MOBILE_TABS.find((t) => t.stages.includes(stage as PipelineStage));
  return t?.id ?? "testing";
}

export interface DealCard {
  id: number;
  ref_no: string;
  customer_type: "B2B" | "B2C";
  customer_name: string;
  product_label: string;
  total_value: number;
  discount_percent: number;
  discount_status: "none" | "auto" | "pending" | "approved" | "rejected";
  pipeline_stage: string;
  owner_id: number;
  owner_name: string;
  urgency: "normal" | "urgent";
  closing_date: string | null;
  created_at: string;
  updated_at: string;
  has_approval: number;
  items_count: number;
}

export interface ApiError {
  message: string;
}

export async function apiFetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as ApiError)?.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}