import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&branch_id=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const branchId = searchParams.get('branch_id')

    const dateFilter = from && to ? 'AND o.created_at BETWEEN CONCAT(?, " 00:00:00") AND CONCAT(?, " 23:59:59")' : ''
    const params: any[] = []
    if (branchId) params.push(Number(branchId))
    if (from && to) params.push(from, to)

    // Summary (same as reports)
    const sales = await query<any>(
      `SELECT COALESCE(SUM(o.subtotal),0) AS subtotal,
              COALESCE(SUM(o.discount),0) AS discount,
              COALESCE(SUM(o.tax),0) AS tax,
              COALESCE(SUM(o.total),0) AS total,
              COUNT(*) AS orders
         FROM orders o
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}`,
      params.length ? params : undefined as any
    )

    // Top items
    const topItems = await query<any>(
      `SELECT oi.item_id, COALESCE(oi.item_name_snapshot, i.name) AS name,
              SUM(oi.quantity) AS qty, SUM(oi.line_total) AS revenue
         FROM order_items oi
         LEFT JOIN items i ON oi.item_id = i.id
         JOIN orders o ON oi.order_id = o.id
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}
        GROUP BY oi.item_id, name
        ORDER BY revenue DESC
        LIMIT 10`,
      params.length ? params : undefined as any
    )

    // Low stock (per inventory)
    const invParams: any[] = []
    if (branchId) invParams.push(Number(branchId))
    const lowStock = await query<any>(
      `SELECT inv.id, inv.ingredient_id, COALESCE(ing.name, '') AS ingredient, inv.quantity, inv.unit, inv.min_threshold
         FROM inventory inv
         LEFT JOIN ingredients ing ON inv.ingredient_id = ing.id
        WHERE 1=1
          ${branchId ? 'AND inv.branch_id = ?' : ''}
          AND COALESCE(inv.quantity,0) <= COALESCE(inv.min_threshold,0)
        ORDER BY inv.quantity ASC
        LIMIT 20`,
      invParams.length ? invParams : undefined as any
    )

    // Recent activities (orders)
    const recent = await query<any>(
      `SELECT o.id, o.order_number, o.total, o.created_at
         FROM orders o
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}
        ORDER BY o.created_at DESC
        LIMIT 10`,
      params.length ? params : undefined as any
    )

    // Normalize created_at to ISO UTC strings so clients parse timestamps consistently
    const recentIso = (recent || []).map((r: any) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    }))

    return NextResponse.json({ summary: sales?.[0] || {}, topItems, lowStock, recentActivities: recentIso })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load dashboard data' }, { status: 500 })
  }
}
