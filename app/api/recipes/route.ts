import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

// GET /api/recipes?item_id=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('item_id')
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 })
  try {
    const rows = await query<any>(
      `SELECT ii.ingredient_id, ing.name, ii.quantity, ii.recipe_unit
         FROM item_ingredients ii
         JOIN ingredients ing ON ii.ingredient_id = ing.id
        WHERE ii.item_id = ?
        ORDER BY ing.name ASC`,
      [itemId]
    )
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load recipe' }, { status: 500 })
  }
}

// POST /api/recipes  { item_id, ingredient_id, quantity, recipe_unit }
export async function POST(req: Request) {
  try {
    const { item_id, ingredient_id, quantity, recipe_unit } = await req.json()
    if (!item_id || !ingredient_id || !quantity || !recipe_unit) {
      return NextResponse.json({ error: 'item_id, ingredient_id, quantity, recipe_unit required' }, { status: 400 })
    }
    await query(
      `INSERT INTO item_ingredients (item_id, ingredient_id, quantity, recipe_unit, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), recipe_unit = VALUES(recipe_unit), updated_at = UTC_TIMESTAMP()`,
      [item_id, ingredient_id, quantity, recipe_unit]
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to upsert recipe row' }, { status: 500 })
  }
}

// DELETE /api/recipes  { item_id, ingredient_id }
export async function DELETE(req: Request) {
  try {
    const { item_id, ingredient_id } = await req.json()
    if (!item_id || !ingredient_id) return NextResponse.json({ error: 'item_id and ingredient_id required' }, { status: 400 })
    await query(`DELETE FROM item_ingredients WHERE item_id = ? AND ingredient_id = ?`, [item_id, ingredient_id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete recipe row' }, { status: 500 })
  }
}


