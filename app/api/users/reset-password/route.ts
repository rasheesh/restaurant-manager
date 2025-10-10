import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/mysql"

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }
    const hashedPassword = await bcrypt.hash("password", 10)
    await query("UPDATE users SET password=?, has_pending_reset=0 WHERE id=?", [hashedPassword, id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/users/reset-password error:", err)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
