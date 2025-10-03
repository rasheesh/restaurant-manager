import mysql from 'mysql2/promise'

// Prefer MYSQL_URL if provided, fallback to DATABASE_URL for backward compatibility
const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error('MYSQL_URL or DATABASE_URL must be set in environment variables')
}

export const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await pool.query(sql, params)
    return rows as T[]
}


