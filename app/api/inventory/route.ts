import { NextResponse } from 'next/server'
import { query, getConnection } from '@/lib/mysql'

// GET /api/inventory?branch_id=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const branchId = Number(searchParams.get('branch_id') || '0') || 1
    const rows = await query<any>(
      `SELECT inv.id, inv.ingredient_id, inv.branch_id, inv.quantity, inv.unit, inv.min_threshold,
              inv.created_at, inv.updated_at,
              ing.name AS ingredient, ing.cost_per_unit AS unitCost
         FROM inventory inv
         JOIN ingredients ing ON inv.ingredient_id = ing.id
        WHERE inv.branch_id = ?
        ORDER BY ing.name ASC`,
      [branchId]
    )
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load inventory' }, { status: 500 })
  }
}

// POST /api/inventory  { item_id, branch_id, quantity, unit, min_threshold }
export async function POST(req: Request) {
  try {
    const { ingredient_id, branch_id, quantity = 0, unit, min_threshold = 0 } = await req.json()
    if (!ingredient_id || !branch_id || !unit) {
      return NextResponse.json({ error: 'ingredient_id, branch_id, unit are required' }, { status: 400 })
    }
    const result: any = await query(
      `INSERT INTO inventory (ingredient_id, branch_id, quantity, unit, min_threshold, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [ingredient_id, branch_id, quantity, unit, min_threshold]
    )
    return NextResponse.json({ id: result?.insertId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create inventory item' }, { status: 500 })
  }
}

// PATCH /api/inventory  { item_id, branch_id, delta, reason, notes, user_id }
export async function PATCH(req: Request) {
  const { ingredient_id, branch_id, delta, reason = 'adjustment', notes = null, user_id = null } = await req.json()
  if (!ingredient_id || !branch_id || !delta) {
    return NextResponse.json({ error: 'ingredient_id, branch_id, delta are required' }, { status: 400 })
  }
  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE inventory SET quantity = GREATEST(quantity + ?, 0), updated_at = UTC_TIMESTAMP() WHERE ingredient_id = ? AND branch_id = ?`,
      [delta, ingredient_id, branch_id]
    )

    await conn.query(
      `INSERT INTO inventory_movements (ingredient_id, branch_id, quantity_change, reason, order_id, reference, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, UTC_TIMESTAMP())`,
      [ingredient_id, branch_id, delta, reason, notes, user_id]
    )

    await conn.commit()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    try { await conn.rollback() } catch {}
    return NextResponse.json({ error: error?.message || 'Failed to adjust stock' }, { status: 500 })
  } finally {
    conn.release()
  }
}




