import mysql from "mysql2/promise";

// Keep-alive untuk Aiven free tier (service tidur saat idle).
// Berjalan otomatis setiap 15 menit lewat Netlify Scheduled Functions.
export default async () => {
  const sslMode = process.env.DB_SSL === "1" || process.env.DB_SSL === "true";
  let state = "skipped";
  let detail = "";
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      connectionLimit: 1,
      ssl: sslMode ? { rejectUnauthorized: false } : undefined,
    });
    const [rows] = await pool.query("SELECT 1 AS ok");
    state = rows[0]?.ok === 1 ? "ok" : "unknown";
    await pool.end();
  } catch (err) {
    state = "error";
    detail = err?.message ?? String(err);
    console.error("[keepalive] failed:", detail);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ keepalive: state, detail, at: new Date().toISOString() }),
  };
};

export const config = {
  schedule: "*/15 * * * *",
};