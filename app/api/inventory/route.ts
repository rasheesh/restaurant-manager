import { NextResponse } from 'next/server'
import { query, getConnection } from '@/lib/mysql'

// GET /api/inventory?branch_id=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const branchParam = searchParams.get('branch_id')
    const hasBranch = branchParam !== null && branchParam !== ''
    const branchId = hasBranch ? Number(branchParam) : null
    const rows = await query<any>(
      `SELECT inv.id, inv.ingredient_id, inv.branch_id, inv.quantity, inv.unit, inv.min_threshold,
              inv.created_at, inv.updated_at,
              ing.name AS ingredient, ing.cost_per_unit AS unitCost
         FROM inventory inv
         JOIN ingredients ing ON inv.ingredient_id = ing.id
        WHERE 1=1
          ${hasBranch ? 'AND inv.branch_id = ?' : ''}
        ORDER BY ing.name ASC`,
      hasBranch ? [branchId] as any : undefined as any
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
  console.log('PATCH function called')
  const { ingredient_id, branch_id, delta, reason = 'adjustment', notes = null, user_id = null } = await req.json()
  console.log('PATCH request received:', { ingredient_id, branch_id, delta, reason, notes, user_id })
  
  if (!ingredient_id || !branch_id || !delta) {
    return NextResponse.json({ error: 'ingredient_id, branch_id, delta are required' }, { status: 400 })
  }
  
  const conn = await getConnection()
  try {
    console.log('Starting transaction...')
    await conn.beginTransaction()

    console.log('Updating inventory...')
    await conn.query(
      `UPDATE inventory SET quantity = GREATEST(quantity + ?, 0), updated_at = UTC_TIMESTAMP() WHERE ingredient_id = ? AND branch_id = ?`,
      [delta, ingredient_id, branch_id]
    )

    console.log('Inserting into inventory_movements...')
    await conn.query(
      `INSERT INTO inventory_movements (item_id, ingredient_id, branch_id, quantity_change, reason, order_id, notes, movement_type, quantity, created_by)
       VALUES (1, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [ingredient_id, branch_id, delta, reason, notes, 'adjustment', delta, user_id]
    )

    console.log('Committing transaction...')
    await conn.commit()
    console.log('Transaction committed successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Stock adjustment error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error details:', JSON.stringify(error))
    try { await conn.rollback() } catch {}
    return NextResponse.json({ error: error?.message || 'Failed to adjust stock' }, { status: 500 })
  } finally {
    conn.release()
  }
}




