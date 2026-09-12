import mysql from "mysql2/promise";

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