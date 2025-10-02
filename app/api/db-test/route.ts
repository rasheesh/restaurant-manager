import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

export async function GET() {
    try {
        const rows = await query<{ one: number }>('SELECT 1 AS one')
        return NextResponse.json({ ok: true, result: rows[0]?.one ?? null })
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error?.message || 'Database error' },
            { status: 500 }
        )
    }
}


