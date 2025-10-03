import pool from "../api/db-test/db.js";
import bcrypt from "bcrypt";

export async function getUsers() {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.email, r.name AS role, b.name AS branch, s.name AS status, u.last_login
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN branches b ON u.branch_id = b.id
    JOIN statuses s ON u.status_id = s.id
  `);
  return rows;
}

export async function createUser(name, email, password, role_id, branch_id, status_id) {
  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.query(`
    INSERT INTO users (name, email, password, role_id, branch_id, status_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, email, hashed, role_id, branch_id, status_id]);

  return result.insertId;
}