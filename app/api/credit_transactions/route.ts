import { NextResponse } from 'next/server'
import { query } from '@/lib/mysql'

// GET /api/credit_transactions?customer_id=&status=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customer_id')
    const rows = await query<any>(
      `SELECT ct.id, ct.credit_customer_id, cc.name AS customer_name, cc.contact,
              ct.order_id, ct.amount, ct.description, ct.created_at
         FROM credit_transactions ct
         JOIN credit_customers cc ON ct.credit_customer_id = cc.id
        ${customerId ? 'WHERE ct.credit_customer_id = ?' : ''}
        ORDER BY ct.created_at DESC`,
      customerId ? [customerId] : undefined as any
    )
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load credit transactions' }, { status: 500 })
  }
}

// POST: create credit transaction (e.g., on order when payment_method='credit' or for payments)
export async function POST(req: Request) {
  try {
    const { credit_customer_id, order_id, amount, description } = await req.json()
    if (!credit_customer_id || !amount) return NextResponse.json({ error: 'credit_customer_id and amount required' }, { status: 400 })
    const result: any = await query(
      `INSERT INTO credit_transactions (credit_customer_id, order_id, amount, description, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [credit_customer_id, order_id || null, amount, description || null]
    )
    return NextResponse.json({ id: result?.insertId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create credit transaction' }, { status: 500 })
  }
}




