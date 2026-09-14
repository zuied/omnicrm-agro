import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Koneksi aman (TSL/SSL) untuk database eksternal seperti Aiven.
// DB_SSL=1 + DB_SSL_CA=path → pakai CA certificate; DB_SSL=1 tanpa CA → trust-all (MVP).
const sslMode = process.env.DB_SSL === "1" || process.env.DB_SSL === "true";
const caFile = process.env.DB_SSL_CA;

let sslConfig: { ca?: string | Buffer; rejectUnauthorized?: boolean } | undefined;
if (sslMode) {
  if (caFile) {
    const candidates = [caFile];
    if (!path.isAbsolute(caFile)) {
      candidates.unshift(path.join(/* turbopackIgnore: true */ process.cwd(), caFile));
    }
    const caPath = candidates.find(existsSync);
    if (caPath) {
      sslConfig = { ca: readFileSync(caPath) };
    } else {
      // CA tidak ikut terbundle (mis. Netlify function) → pakai trust-all agar tidak crash.
      console.warn(`[db] DB_SSL_CA "${caFile}" tidak ditemukan; fallback rejectUnauthorized:false`);
      sslConfig = { rejectUnauthorized: false };
    }
  } else {
    sslConfig = { rejectUnauthorized: false };
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "omnicrm_agro",
  waitForConnections: true,
  connectionLimit: 8,
  charset: "utf8mb4",
  decimalNumbers: false,
  dateStrings: true,
  timezone: "local",
  ssl: sslConfig,
});

export type QueryResult = mysql.ResultSetHeader;

export async function query<T = Record<string, unknown>>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: any[] = []): Promise<QueryResult> {
  const [res] = await pool.execute(sql, params);
  return res as QueryResult;
}

export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export type Conn = mysql.PoolConnection;