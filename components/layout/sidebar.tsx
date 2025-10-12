"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RoleChecker from "../auth/role-checker"

interface User {
  email: string
  branch: string
  role: string
}

interface SidebarProps {
  user: User
  currentPage: string
  collapsed?: boolean
  mobileOpen?: boolean
}

export default function Sidebar({ user, currentPage, collapsed, mobileOpen }: SidebarProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  // internal collapsed state (prop overrides), persisted so toggle is available across pages
  const [collapsedState, setCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("sidebarCollapsed")
      return typeof collapsed !== "undefined" ? collapsed : (stored ? JSON.parse(stored) : false)
    } catch {
      return Boolean(collapsed)
    }
  })

  useEffect(() => {
    if (typeof collapsed !== "undefined") setCollapsedState(collapsed)
  }, [collapsed])

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsedState))
    } catch {}
  }, [collapsedState])

  // notify other parts of the app when sidebar collapsed state changes
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("sidebar:toggled", { detail: { collapsed: collapsedState } }))
    } catch {}
  }, [collapsedState])

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"

  const menuItems = [
    { href: "/dashboard", label: "📊 Dashboard", roles: ["admin"] },
    { href: "/dishes", label: "🍽️ Dish & Item Management", roles: ["admin", "supervisor"] },
    { href: "/inventory", label: "📦 Inventory", roles: ["admin", "supervisor"] },
    { href: "/pos", label: "🛒 Point of Sale", roles: ["admin", "supervisor", "cashier"] },
    { href: "/credit", label: "💳 Credit Management", roles: ["admin", "supervisor"] },
    { href: "/reports", label: "📈 Reports", roles: ["admin"] },
  ]

  // helper: split an item label like "📊 Dashboard" into { icon: '📊', text: 'Dashboard' }
  const splitLabel = (label: string) => {
    if (!label || typeof label !== "string") return { icon: "", text: "" }
    const parts = label.trim().split(/\s+/)
    const icon = parts.length ? parts[0] : ""
    const text = parts.length > 1 ? parts.slice(1).join(" ") : ""
    return { icon, text }
  }

  const isCompact = Boolean(collapsedState) && !isHovered
  const widthFull = 240
  const widthCompact = 60
  const width = isCompact ? widthCompact : widthFull

  return (
    <>
      {/* Hamburger button inside Sidebar so it's visible across pages */}
      <button
        className="fp-hamburger"
        aria-label="Toggle sidebar"
        onClick={() => {
          setCollapsedState((s) => !s)
          setIsHovered(false)
        }}
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 3001,
          background: "#ffffff",
          color: "#222222",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 6,
          padding: "8px 10px",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        }}
      >
        ☰
      </button>

      <nav
        className={`sidebar ${isCompact ? "collapsed" : ""} ${isHovered && collapsedState ? "hovered" : ""} ${mobileOpen ? "show-mobile" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-expanded={!isCompact}
        style={{
          width: `${width}px`,
          minWidth: `${width}px`,
          transition: "width 260ms ease, transform 260ms ease",
          transform: mobileOpen ? "translateX(0)" : undefined,
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#ffffff",   // ensure white bg
          color: "#222222",        // ensure dark text (overrides inline white)
          zIndex: 1000,
        }}
      >
        <div style={{ padding: "20px", borderBottom: "1px solid rgba(222,226,230,0.1)" }}>
          <h2 style={{ color: "#222222", margin: 0, fontSize: "1.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {!isCompact ? "Food Business POS" : "POS"}
          </h2>
          <p style={{ color: "rgba(0,0,0,0.6)", margin: "5px 0 0 0", fontSize: "0.9rem" }}>
            {branchName} Branch • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </p>
          <div
            style={{
              display: "inline-block",
              background: user.role === "admin" ? "#dc3545" : user.role === "supervisor" ? "#ffc107" : "#28a745",
              color: user.role === "supervisor" ? "#000" : "#fff",
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

        <ul className="nav-menu" style={{ padding: 8, margin: 0, listStyle: "none", flex: 1 }}>
          {menuItems.map((item) => {
            const { icon, text } = splitLabel(item.label)
            return (
              <RoleChecker key={item.href} allowedRoles={item.roles}>
                <li className="nav-item" style={{ margin: "4px 8px" }}>
                  <a
                    href={item.href}
                    className={`nav-link ${currentPage === item.href ? "active" : ""}`}
                    onClick={(e) => { e.preventDefault(); handleNavigation(item.href) }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: isCompact ? "10px 8px" : "10px 16px",
                      /* color removed so CSS controls text color */
                      textDecoration: "none",
                      borderRadius: 6,
                      transition: "background 160ms ease, color 160ms ease",
                      justifyContent: isCompact ? "center" : "flex-start",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ width: 28, textAlign: "center" }}>{item.label.split(" ")[0]}</span>
                    <span style={{ display: isCompact ? "none" : "inline" }}>{item.label.split(" ").slice(1).join(" ")}</span>
                  </a>
                </li>
              </RoleChecker>
            )
          })}

          <RoleChecker allowedRoles={["admin"]}>
            <li className="nav-item" style={{ marginTop: "20px", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "20px" }}>
              {!isCompact && <div style={{ padding: "12px 20px", color: "rgba(0,0,0,0.6)", fontSize: "0.85rem", fontWeight: 600 }}>ADMIN TOOLS</div>}
            </li>
            <li className="nav-item">
              <a
                href="/admin/users"
                className="nav-link"
                onClick={(e) => { e.preventDefault(); handleNavigation("/admin/users") }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: isCompact ? "10px 8px" : "10px 16px", justifyContent: isCompact ? "center" : "flex-start", textDecoration: "none" }}
              >
                <span style={{ width: 28, textAlign: "center" }}>👥</span>
                <span style={{ display: isCompact ? "none" : "inline" }}>User Management</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                href="/admin/settings"
                className="nav-link"
                onClick={(e) => { e.preventDefault(); handleNavigation("/admin/settings") }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: isCompact ? "10px 8px" : "10px 16px", justifyContent: isCompact ? "center" : "flex-start", textDecoration: "none" }}
              >
                <span style={{ width: 28, textAlign: "center" }}>⚙️</span>
                <span style={{ display: isCompact ? "none" : "inline" }}>System Settings</span>
              </a>
            </li>
          </RoleChecker>

          <li className="nav-item" style={{ marginTop: "auto", padding: 12 }}>
            <a
              href="/"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault()
                localStorage.removeItem("user")
                handleNavigation("/")
              }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: isCompact ? "10px 8px" : "10px 16px", justifyContent: isCompact ? "center" : "flex-start", textDecoration: "none" }}
            >
              <span style={{ width: 28, textAlign: "center" }}>🚪</span>
              <span style={{ display: isCompact ? "none" : "inline" }}>Logout</span>
            </a>
          </li>
        </ul>
      </nav>
    </>
  )
}
