import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&branch_id=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const branchId = searchParams.get('branch_id')

    const dateFilter = from && to ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : ''
    const params: any[] = []
    if (branchId) params.push(Number(branchId))
    if (from && to) params.push(from, to)

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

    const payments = await query<any>(
      `SELECT p.method, COUNT(*) AS count, SUM(p.amount) AS amount
         FROM payments p
         JOIN orders o ON p.order_id = o.id
        WHERE 1=1
          ${branchId ? 'AND o.branch_id = ?' : ''}
          ${dateFilter}
        GROUP BY p.method
        ORDER BY amount DESC`,
      params.length ? params : undefined as any
    )

    return NextResponse.json({ summary: sales?.[0] || {}, topItems, payments })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load reports' }, { status: 500 })
  }
}




