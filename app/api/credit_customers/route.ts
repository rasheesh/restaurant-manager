import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

export async function GET() {
  try {
    const rows = await query<any>('SELECT id, name, contact, created_at FROM credit_customers ORDER BY name ASC')
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load credit customers' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, contact } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result: any = await query(
      'INSERT INTO credit_customers (name, contact, created_at) VALUES (?, ?, UTC_TIMESTAMP())',
      [name, contact || null]
    )
    return NextResponse.json({ id: result?.insertId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create customer' }, { status: 500 })
  }
}




