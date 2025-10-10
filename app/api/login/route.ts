import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/mysql"

// maps (IDs -> strings)
const roleMap: Record<number, string> = { 1: "admin", 2: "manager", 3: "cashier" }
const branchMap: Record<number, string> = { 1: "exxa", 2: "tera", 3: "cnx", 99: "all" }

export async function POST(req: Request) {
  const { email, password } = await req.json()

  try {
    const rows: any[] = await query("SELECT * FROM users WHERE email = ?", [email])

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = rows[0]
    const match = await bcrypt.compare(password, user.password)

    if (!match) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // ✅ store UTC time as last_login
    await query("UPDATE users SET last_login = UTC_TIMESTAMP() WHERE id = ?", [user.id])

    // fetch updated row
    const updatedRows: any[] = await query("SELECT * FROM users WHERE id = ?", [user.id])
    const updatedUser = updatedRows[0]

    // ✅ keep UTC datetime but don’t force Z manually
    const lastLoginIso = updatedUser.last_login
      ? new Date(updatedUser.last_login).toISOString()
      : null

    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: roleMap[updatedUser.role_id] ?? "cashier",
      branch: branchMap[updatedUser.branch_id] ?? "exxa",
      status: updatedUser.status_id === 1 ? "active" : "inactive",
      lastLogin: lastLoginIso, // proper ISO string in UTC
    }

    return NextResponse.json({ user: userData })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}