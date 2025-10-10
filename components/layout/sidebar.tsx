"use client"

import RoleChecker from "../auth/role-checker"

interface User {
  email: string
  branch: string
  role: string
}

interface SidebarProps {
  user: User
  currentPage: string
}

export default function Sidebar({ user, currentPage }: SidebarProps) {
  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"

  const menuItems = [
    { href: "/dashboard", label: "📊 Dashboard", roles: ["admin"] },
    { href: "/dishes", label: "🍽️ Dish & Item Management", roles: ["admin", "manager"] },
    { href: "/inventory", label: "📦 Inventory", roles: ["admin", "manager"] },
    { href: "/pos", label: "🛒 Point of Sale", roles: ["admin", "manager", "cashier"] },
    { href: "/credit", label: "💳 Credit Management", roles: ["admin", "manager"] },
    { href: "/reports", label: "📈 Reports", roles: ["admin"] },
  ]

  return (
    <nav className="sidebar">
      <div style={{ padding: "20px", borderBottom: "1px solid #dee2e6" }}>
        <h2 style={{ color: "#2d5a27", margin: 0, fontSize: "1.5rem" }}>Food Business POS</h2>
        <p style={{ color: "#6c757d", margin: "5px 0 0 0", fontSize: "0.9rem" }}>
          {branchName} Branch • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </p>
        <div
          style={{
            display: "inline-block",
            background: user.role === "admin" ? "#dc3545" : user.role === "manager" ? "#ffc107" : "#28a745",
            color: user.role === "manager" ? "#000" : "#fff",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: "600",
            marginTop: "5px",
          }}
        >
          {user.role.toUpperCase()}
        </div>
      </div>

      <ul className="nav-menu">
        {menuItems.map((item) => (
          <RoleChecker key={item.href} allowedRoles={item.roles}>
            <li className="nav-item">
              <a href={item.href} className={`nav-link ${currentPage === item.href ? "active" : ""}`}>
                {item.label}
              </a>
            </li>
          </RoleChecker>
        ))}

        <RoleChecker allowedRoles={["admin"]}>
          <li className="nav-item" style={{ marginTop: "20px", borderTop: "1px solid #dee2e6", paddingTop: "20px" }}>
            <div style={{ padding: "12px 20px", color: "#6c757d", fontSize: "0.85rem", fontWeight: "600" }}>
              ADMIN TOOLS
            </div>
          </li>
          <li className="nav-item">
            <a href="/admin/users" className="nav-link">
              👥 User Management
            </a>
          </li>
          <li className="nav-item">
            <a href="/admin/settings" className="nav-link">
              ⚙️ System Settings
            </a>
          </li>
        </RoleChecker>

        <li className="nav-item" style={{ marginTop: "20px", borderTop: "1px solid #dee2e6", paddingTop: "20px" }}>
          <a href="/" className="nav-link" onClick={() => localStorage.removeItem("user")}>
            🚪 Logout
          </a>
        </li>
      </ul>
    </nav>
  )
}
