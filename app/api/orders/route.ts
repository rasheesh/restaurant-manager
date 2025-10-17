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

  // Aggregate requested quantities per item (supporting fractional quantities)
  const requestedByItem: Record<number, number> = {}
  for (const it of items) {
    if (it.item_id) {
      const itemIdNum = Number(it.item_id)
      const qty = Number(it.quantity)
      requestedByItem[itemIdNum] = (requestedByItem[itemIdNum] || 0) + qty
    }
  }

  const conn = await getConnection()
  try {
    await conn.beginTransaction()

    // Validate stock/servings availability atomically
    if (Object.keys(requestedByItem).length) {
      const ids = Object.keys(requestedByItem).map((k) => Number(k))
      const placeholders = ids.map(() => '?').join(',')
      const [rows]: any = await conn.query(
        `SELECT id, name, available, COALESCE(servings_available,0) AS servings_available
           FROM items
          WHERE id IN (${placeholders})
          FOR UPDATE`,
        ids
      )
      const insufficient: string[] = []
      for (const row of rows) {
        const need = Number(requestedByItem[row.id] || 0)
        const have = Number(row.servings_available || 0)
        if (!row.available) {
          insufficient.push(`${row.name} (unavailable)`) 
          continue
        }
        if (have < need) {
          insufficient.push(`${row.name} (need ${need}, have ${have})`)
        }
      }
      if (insufficient.length) {
        await conn.rollback()
        return NextResponse.json({ error: `Insufficient servings: ${insufficient.join(', ')}` }, { status: 400 })
      }
    }

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
            `INSERT INTO inventory_movements (
                item_id, ingredient_id, branch_id, quantity_change, order_id, user_id, notes, movement_type, quantity, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemIdNum,
              r.ingredient_id,
              branch_id,
              -Math.abs(totalUse),
              orderId,
              user_id,
              notes,
              'sale',
              -Math.abs(totalUse),
              user_id
            ]
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
    const dateFilter = from && to ? 'AND o.created_at BETWEEN CONCAT(?, " 00:00:00") AND CONCAT(?, " 23:59:59")' : ''
    const params: any[] = []
    if (branchId) params.push(Number(branchId))
    if (from && to) params.push(from, to)

    const [rows]: any = await conn.query(
      `SELECT o.id, o.order_number, o.total, o.created_at, o.branch_id, o.user_id, o.payment_method,
              COUNT(oi.id) AS items_count,
              (UNIX_TIMESTAMP(o.created_at) * 1000) AS created_at_ms
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}
        GROUP BY o.id
        ORDER BY o.created_at DESC` ,
      params.length ? params : undefined as any
    )
    // Use server-provided epoch ms as the canonical instant; also provide a local-formatted string for convenience
    const enhanced = (rows || []).map((r: any) => {
      const created_at_ms = r.created_at_ms != null ? Number(r.created_at_ms) : (r.created_at ? new Date(r.created_at).getTime() : null)
      let created_at_local = null
      if (created_at_ms) {
        const dt = new Date(created_at_ms)
        const pad = (n: number) => String(n).padStart(2, '0')
        const YYYY = dt.getFullYear()
        const MM = pad(dt.getMonth() + 1)
        const DD = pad(dt.getDate())
        const hh = pad(dt.getHours())
        const mm = pad(dt.getMinutes())
        const ss = pad(dt.getSeconds())
        created_at_local = `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`
      }
      return {
        ...r,
        created_at_ms,
        created_at_local,
      }
    })
    return NextResponse.json(enhanced)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load orders' }, { status: 500 })
  } finally {
    conn.release()
  }
}


