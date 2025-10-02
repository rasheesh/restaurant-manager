import mysql from 'mysql2/promise'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables')
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


