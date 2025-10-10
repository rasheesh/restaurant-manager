import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

export async function GET() {
  try {
    const rows = await query<any>('SELECT id, name, default_unit, cost_per_unit FROM ingredients ORDER BY name ASC')
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load ingredients' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, default_unit, cost_per_unit } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result: any = await query(
      'INSERT INTO ingredients (name, default_unit, cost_per_unit, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())',
      [name, default_unit || null, cost_per_unit ?? null]
    )
    return NextResponse.json({ id: result?.insertId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create ingredient' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, default_unit, cost_per_unit } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await query(
      'UPDATE ingredients SET name = ?, default_unit = ?, cost_per_unit = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [name, default_unit || null, cost_per_unit ?? null, id]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update ingredient' }, { status: 500 })
  }
}


