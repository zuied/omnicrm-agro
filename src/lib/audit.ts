import { execute } from "./db";

/** Catat ke audit_logs dengan detail JSON. */
export async function auditLog(opts: {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: unknown;
}) {
  try {
    await execute(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail) VALUES (?,?,?,?,?)",
      [opts.userId, opts.action, opts.entityType ?? null, opts.entityId ?? null, opts.detail ? JSON.stringify(opts.detail) : null]
    );
  } catch {
    // jangan rusak request utama bila audit gagal
  }
}