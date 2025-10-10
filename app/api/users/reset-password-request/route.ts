import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    // Find user by email
    const rows: any[] = await query("SELECT * FROM users WHERE email = ?", [email])
    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const user = rows[0]
    // Set has_pending_reset=1
    await query("UPDATE users SET has_pending_reset=1 WHERE id=?", [user.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/users/reset-password-request error:", err)
    return NextResponse.json({ error: "Failed to request password reset" }, { status: 500 })
  }
}
