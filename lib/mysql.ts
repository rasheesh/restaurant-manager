import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function getDatabaseUrl(): string {
    const url = process.env.MYSQL_URL || process.env.DATABASE_URL
    return url || ''
}

function getSslConfig(): mysql.SslOptions | undefined {
    // Railway typically requires SSL; allow opt-out for local dev via MYSQL_SSL=false
    const wantSsl = (process.env.MYSQL_SSL || process.env.DB_SSL || 'true').toLowerCase() !== 'false'
    if (!wantSsl) return undefined
    return { rejectUnauthorized: false }
}

export function getPool(): mysql.Pool {
    if (pool) return pool
    const databaseUrl = getDatabaseUrl()
    if (!databaseUrl) {
        throw new Error('MYSQL_URL or DATABASE_URL must be set in environment variables')
    }
    pool = mysql.createPool({
        uri: databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: getSslConfig(),
    })
    return pool
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const activePool = getPool()
    const [rows] = await activePool.query(sql, params)
    return rows as T[]
}


export async function getConnection(): Promise<mysql.PoolConnection> {
    const activePool = getPool()
    return await activePool.getConnection()
}


