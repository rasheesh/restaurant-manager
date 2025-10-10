import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getSslConfig(): mysql.SslOptions | undefined {
  // Read environment variables directly
  const host = process.env.DB_HOST;

  // Allow disabling SSL for local development
  const wantSsl =
    (process.env.MYSQL_SSL || process.env.DB_SSL || "true").toLowerCase() !==
    "false";

  // Disable SSL automatically if using localhost or 127.0.0.1
  const isLocal =
    host?.includes("localhost") ||
    host?.includes("127.0.0.1") ||
    host?.includes("0.0.0.0");

  if (!wantSsl || isLocal) return undefined;

  return { rejectUnauthorized: false };
}

export function getPool(): mysql.Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (process.env.DB_HOST) {
    // ✅ Prefer DB_ vars when available (local dev / Railway proxy)
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: getSslConfig(),
    });
  } else if (databaseUrl) {
    // ✅ Fallback for production (Railway's DATABASE_URL / MYSQL_URL)
    pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: getSslConfig(),
    });
  } else {
    throw new Error("❌ No database configuration found in environment variables.");
  }

  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const activePool = getPool(); // ✅ ensures pool is initialized
  const [rows] = await activePool.query(sql, params);
  return rows as T[];
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  const activePool = getPool(); // ✅ ensures pool is initialized
  return await activePool.getConnection();
}
