import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

// GET: list items with category
export async function GET() {
  try {
    const rows = await query<any>(
      `SELECT i.id, i.name, i.price, i.available, i.servings_available, i.total_servings, i.image_url,
              i.category_id, c.name AS category
         FROM items i
         LEFT JOIN categories c ON i.category_id = c.id`
    )
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load items' }, { status: 500 })
  }
}

// POST: create item
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, price, category_id, available = true, servings_available = 0, total_servings = 0, image_url = null } = body
    if (!name || price == null) {
      return NextResponse.json({ error: 'name and price are required' }, { status: 400 })
    }
    const result: any = await query(
      `INSERT INTO items (name, category_id, price, available, servings_available, total_servings, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [name, category_id ?? null, price, !!available, servings_available, total_servings, image_url]
    )
    return NextResponse.json({ id: result?.insertId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create item' }, { status: 500 })
  }
}

// PUT: update item
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, price, category_id, available, servings_available, total_servings, image_url } = body
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await query(
      `UPDATE items SET name = ?, price = ?, category_id = ?, available = ?,
        servings_available = ?, total_servings = ?, image_url = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
      [name, price, category_id ?? null, !!available, servings_available ?? 0, total_servings ?? 0, image_url ?? null, id]
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 })
  }
}

// DELETE: delete item
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Check if item exists
    const existingItem = await query<any>(
      `SELECT id FROM items WHERE id = ?`,
      [id]
    )

    if (!existingItem || existingItem.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Delete related records first (recipes, order_items, etc.)
    await query(`DELETE FROM item_ingredients WHERE item_id = ?`, [id])
    await query(`DELETE FROM order_items WHERE item_id = ?`, [id])
    
    // Delete the item
    await query(`DELETE FROM items WHERE id = ?`, [id])
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete item' }, { status: 500 })
  }
}


