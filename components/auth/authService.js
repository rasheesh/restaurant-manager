import pool from "../api/db.js";
import bcrypt from "bcrypt";

export async function login(email, password) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  if (rows.length === 0) return { error: "User not found" };

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) return { error: "Invalid password" };

  return {
    id: user.id,
    name: user.name,
    role: user.role_id,
    branch: user.branch_id,
    status: user.status_id
  };
}
