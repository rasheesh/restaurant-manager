import { NextResponse } from 'next/server'
import { getConnection } from '@/lib/mysql'

// POST /api/orders
// Body:
// {
//   user_id, branch_id, items: [{ item_id, name_snapshot?, unit_price, quantity }],
//   discount=0, tax=0, payment_method, reference_number?, notes?
// }
export async function POST(req: Request) {
  const body = await req.json()
  const {
    user_id,
    branch_id,
    items,
    discount = 0,
    tax = 0,
    payment_method,
    reference_number = null,
    notes = null,
  } = body

  if (!user_id || !branch_id || !Array.isArray(items) || items.length === 0 || !payment_method) {
    return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 })
  }

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    // Compute totals
    let subtotal = 0
    for (const it of items) subtotal += Number(it.unit_price) * Number(it.quantity)
    const total = subtotal - Number(discount) + Number(tax)

    // Next order number per branch
    const [lastOrderRows]: any = await conn.query(
      'SELECT order_number FROM orders WHERE branch_id = ? ORDER BY order_number DESC LIMIT 1',
      [branch_id]
    )
    const nextOrderNumber = (lastOrderRows?.[0]?.order_number ?? 0) + 1

    // Insert order
    const [orderResult]: any = await conn.query(
      `INSERT INTO orders (order_number, user_id, branch_id, subtotal, discount, tax, total, payment_method, reference_number, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [nextOrderNumber, user_id, branch_id, subtotal, discount, tax, total, payment_method, reference_number, notes]
    )
    const orderId = orderResult.insertId

    // Insert order_items and accumulate per-item quantities for servings decrement
    const itemIdToQuantity: Record<number, number> = {}
    for (const it of items) {
      const nameSnapshot = it.name_snapshot ?? null
      const lineTotal = Number(it.unit_price) * Number(it.quantity)
      await conn.query(
        `INSERT INTO order_items (order_id, item_id, item_name_snapshot, unit_price, quantity, line_total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [orderId, it.item_id, nameSnapshot, it.unit_price, it.quantity, lineTotal]
      )

      // Deduct ingredients based on recipe (item_ingredients)
      if (it.item_id) {
        const itemIdNum = Number(it.item_id)
        itemIdToQuantity[itemIdNum] = (itemIdToQuantity[itemIdNum] || 0) + Number(it.quantity)
        const [recipeRows]: any = await conn.query(
          `SELECT ingredient_id, quantity FROM item_ingredients WHERE item_id = ?`,
          [it.item_id]
        )
        for (const r of recipeRows) {
          const totalUse = Number(r.quantity) * Number(it.quantity)
          // Ensure inventory row exists for ingredient/branch
          await conn.query(
            `INSERT INTO inventory (ingredient_id, branch_id, quantity, unit, min_threshold, version, created_at, updated_at)
             VALUES (?, ?, 0, NULL, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()` ,
            [r.ingredient_id, branch_id]
          )
          await conn.query(
            `UPDATE inventory SET quantity = GREATEST(quantity - ?, 0), updated_at = UTC_TIMESTAMP()
               WHERE ingredient_id = ? AND branch_id = ?`,
            [totalUse, r.ingredient_id, branch_id]
          )
          await conn.query(
            `INSERT INTO inventory_movements (ingredient_id, branch_id, quantity_change, reason, order_id, reference, notes, created_by, created_at)
             VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [r.ingredient_id, branch_id, -Math.abs(totalUse), orderId, reference_number, notes, user_id]
          )
        }
      }
    }

    // Decrement item servings_available directly from accumulated quantities
    for (const [itemIdStr, qty] of Object.entries(itemIdToQuantity)) {
      const itemIdNum = Number(itemIdStr)
      await conn.query(
        `UPDATE items
            SET servings_available = GREATEST(COALESCE(servings_available,0) - ?, 0),
                available = (GREATEST(COALESCE(servings_available,0) - ?, 0) > 0),
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [qty, qty, itemIdNum]
      )
    }

    // Insert payment
    await conn.query(
      `INSERT INTO payments (order_id, method, amount, reference_number, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [orderId, payment_method, total, reference_number]
    )

    await conn.commit()
    return NextResponse.json({ id: orderId, order_number: nextOrderNumber })
  } catch (error: any) {
    try { await conn.rollback() } catch {}
    return NextResponse.json({ error: error?.message || 'Failed to create order' }, { status: 500 })
  } finally {
    conn.release()
  }
}

// GET /api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&branch_id=
export async function GET(req: Request) {
  const conn = await getConnection()
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const branchId = searchParams.get('branch_id')
    const dateFilter = from && to ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : ''
    const params: any[] = []
    if (branchId) params.push(Number(branchId))
    if (from && to) params.push(from, to)

    const [rows]: any = await conn.query(
      `SELECT o.id, o.order_number, o.total, o.created_at, o.branch_id, o.user_id,
              COUNT(oi.id) AS items_count
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}
        GROUP BY o.id
        ORDER BY o.created_at DESC` ,
      params.length ? params : undefined as any
    )
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load orders' }, { status: 500 })
  } finally {
    conn.release()
  }
}


