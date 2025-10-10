import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/mysql"

function mapRole(roleId: number) {
  switch (roleId) {
    case 1: return "Admin"
    case 2: return "Manager"
    case 3: return "Staff"
    default: return "Unknown"
  }
}

// ✅ GET all users
export async function GET() {
  const rows: any[] = await query("SELECT * FROM users")

  const rowsMapped = rows.map((u: any) => {
    let lastLoginIso = null
    if (u.last_login) {
      let dateObj
      if (typeof u.last_login === "string") {
        // Convert 'YYYY-MM-DD HH:mm:ss' to 'YYYY-MM-DDTHH:mm:ssZ' for UTC
        const match = u.last_login.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/)
        if (match) {
          dateObj = new Date(match[1] + 'T' + match[2] + 'Z')
        } else {
          // fallback: try parsing as is
          dateObj = new Date(u.last_login)
        }
      } else {
        dateObj = new Date(u.last_login)
      }
      lastLoginIso = isNaN(dateObj.getTime()) ? null : dateObj.toISOString()
    }
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role_id: u.role_id,
      branch_id: u.branch_id,
      status_id: u.status_id,
      last_login: lastLoginIso,
    }
  })

  return NextResponse.json(rowsMapped)
}

// ✅ role + branch mapping
const roleMap: Record<string, number> = {
  admin: 1,
  manager: 2,
  cashier: 3,
}

const branchMap: Record<string, number> = {
  exxa: 1,
  tera: 2,
  cnx: 3,
  all: 99, // optional for admin all-branches
}



// ✅ POST new user
export async function POST(req: Request) {
  try {
    const { name, email, password, role, branch } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const roleId = roleMap[role] ?? 3 // default cashier
    const branchId = branchMap[branch] ?? 1 // default exxa

    const [result]: any = await pool.query(
      "INSERT INTO users (name, email, password, role_id, branch_id, status_id, last_login) VALUES (?, ?, ?, ?, ?, 1, NULL)",
      [name, email, hashedPassword, roleId, branchId]
    )

    const result: any = await query(
      "INSERT INTO users (name, email, password, role_id, branch_id, status_id, last_login) VALUES (?, ?, ?, ?, ?, 1, NULL)",
      [name, email, hashedPassword, roleId, branchId]
    )
    return NextResponse.json({ success: true, id: result?.insertId })
  } catch (err) {
    console.error("POST /api/users error:", err)
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 })
  }
}

// ✅ PUT update user
export async function PUT(req: Request) {
  try {
    const { id, name, email, role, branch, password } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const roleId = roleMap[role] ?? 3
    const branchId = branchMap[branch] ?? 1

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10)
      await query(
        "UPDATE users SET name=?, email=?, role_id=?, branch_id=?, password=? WHERE id=?",
        [name, email, roleId, branchId, hashedPassword, id]
      )
    } else {
      await query(
        "UPDATE users SET name=?, email=?, role_id=?, branch_id=? WHERE id=?",
        [name, email, roleId, branchId, id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// ✅ PATCH toggle status
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json()

    // Map string status -> database IDs
    const statusMap: any = {
      active: 1,
      inactive: 2,
    }

    const statusId = statusMap[status] ?? 1

    await query("UPDATE users SET status_id=? WHERE id=?", [statusId, id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}