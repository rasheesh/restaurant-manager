import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

export async function GET() {
  try {
    const rows = await query<any>('SELECT id, name FROM categories ORDER BY name ASC')
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load categories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result: any = await query('INSERT INTO categories (name, created_at) VALUES (?, UTC_TIMESTAMP())', [name])
    return NextResponse.json({ id: result?.insertId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create category' }, { status: 500 })
  }
}


