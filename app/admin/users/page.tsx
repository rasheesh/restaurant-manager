"use client"

import { useState, useEffect } from "react"
import AuthGuard from "../../../components/auth/auth-guard"
import Sidebar from "../../../components/layout/sidebar"

interface User {
  id: string
  email: string
  role: string
  branch: string
  status: string
  lastLogin: string
  name?: string
}

export default function UserManagement() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "cashier",
    branch: "makati",
    password: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const roleMap: any = {
  1: "admin",
  2: "manager",
  3: "cashier",
}

const branchMap: any = {
  1: "makati",
  2: "qc",
  3: "cebu",
  99: "all",
}

// 🔹 Load current user + fetch users from backend
useEffect(() => {
  setMounted(true)
  const userData = localStorage.getItem("user")
  if (userData) setUser(JSON.parse(userData))

  fetchUsers()
}, [])

const fetchUsers = async () => {
  try {
    const res = await fetch("/api/users")
    const data = await res.json()

    setUsers(
      data.map((u: any) => {
        let lastLoginFormatted = "Never"
        if (u.last_login) {
          const date = new Date(u.last_login)
          lastLoginFormatted = isNaN(date.getTime())
            ? "Never"
            : date.toLocaleString("en-US", { timeZone: "Asia/Manila" })
        }
        return {
          id: u.id.toString(),
          name: u.name || "N/A",
          email: u.email,
          role: roleMap[u.role_id] || "cashier",
          branch: branchMap[u.branch_id] || "makati",
          status: u.status_id === 1 ? "active" : "inactive",
          lastLogin: lastLoginFormatted,
        }
      })
    )
  } catch (err) {
    console.error(err)
  }
}

  // 🔹 Form validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!newUser.name.trim()) newErrors.name = "User name is required"

    if (!newUser.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!editingUser && !newUser.password.trim()) {
      newErrors.password = "Password is required"
    } else if (newUser.password && newUser.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    const existingUser = users.find((u) => u.email === newUser.email && u.id !== editingUser?.id)
    if (existingUser) newErrors.email = "Email already exists"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 🔹 Add User
  const handleAddUser = async () => {
    if (!validateForm()) return
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) return alert(data.error)

      setUsers([
        ...users,
        { id: data.id.toString(), ...newUser, status: "active", lastLogin: "Never" },
      ])

      setNewUser({ name: "", email: "", role: "cashier", branch: "makati", password: "" })
      setShowAddModal(false)
    } catch (err) {
      console.error(err)
    }
  }

  // 🔹 Edit User (fill modal)
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewUser({
      name: user.name || "",
      email: user.email,
      role: user.role,
      branch: user.branch,
      password: "",
    })
    setErrors({})
    setShowAddModal(true)
  }

  // 🔹 Update User
  const handleUpdateUser = async () => {
    if (!validateForm() || !editingUser) return
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUser.id, ...newUser }),
      })
      const data = await res.json()
      if (!res.ok) return alert(data.error)

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...newUser } : u)))
      setShowAddModal(false)
      setEditingUser(null)
    } catch (err) {
      console.error(err)
    }
  }

  // 🔹 Close modal
  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingUser(null)
    setNewUser({ name: "", email: "", role: "cashier", branch: "makati", password: "" })
    setErrors({})
  }

  // 🔹 Toggle Status
  const toggleUserStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    const newStatus = user.status === "active" ? "inactive" : "active"

    try {
      const res = await fetch("/api/users", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: userId, status: newStatus }),
})
      const data = await res.json()
      if (!res.ok) return alert(data.error)

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, status: newStatus } : u
        )
      )
    } catch (err) {
      console.error(err)
    }
  }

  // 🔹 Loading state
  if (!mounted || !user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f8f9fa",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e9ecef",
              borderTop: "4px solid #2d5a27",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <p style={{ color: "#6c757d", margin: 0 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar user={user} currentPage="/admin/users" />

        <main className="main-content">
          <div className="page-header">
            <h1>👥 User Management</h1>
            <p>Manage user accounts and permissions</p>
          </div>

          <div className="content-section">
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
            >
              <h2>System Users</h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add New User
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: "600" }}>{user.name || "N/A"}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge ${user.role}`}>{user.role.toUpperCase()}</span>
                      </td>
                      <td>{user.branch === "all" ? "All Branches" : user.branch.toUpperCase()}</td>
                      <td>
                        <span className={`status-badge ${user.status === "active" ? "success" : "danger"}`}>
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEditUser(user)}
                          style={{ marginRight: "8px" }}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${user.status === "active" ? "btn-danger" : "btn-success"}`}
                          onClick={() => toggleUserStatus(user.id)}
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showAddModal && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
                  <button className="modal-close" onClick={handleCloseModal}>
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-group">
                    <label>User Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter full name"
                      className={errors.name ? "error" : ""}
                    />
                    {errors.name && <div className="form-error">{errors.name}</div>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@foodbusiness.com"
                      className={errors.email ? "error" : ""}
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Branch</label>
                    <select value={newUser.branch} onChange={(e) => setNewUser({ ...newUser, branch: e.target.value })}>
                      <option value="makati">Makati</option>
                      <option value="qc">QC</option>
                      <option value="cebu">Cebu</option>
                      {newUser.role === "admin" && <option value="all">All Branches</option>}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      className={errors.password ? "error" : ""}
                    />
                    {errors.password && <div className="form-error">{errors.password}</div>}
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={editingUser ? handleUpdateUser : handleAddUser}>
                    {editingUser ? "Update User" : "Add User"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
