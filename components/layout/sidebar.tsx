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

  // Get collapsed state from localStorage or prop
  const [collapsedState, setCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("sidebarCollapsed")
      return typeof collapsed !== "undefined" ? collapsed : (stored ? JSON.parse(stored) : false)
    } catch {
      return Boolean(collapsed)
    }
  })

  // Update state when prop changes
  useEffect(() => {
    if (typeof collapsed !== "undefined") setCollapsedState(collapsed)
  }, [collapsed])

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsedState))
    } catch {}
  }, [collapsedState])

  // Notify SidebarSync component when state changes
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("sidebar:toggled", { detail: { collapsed: collapsedState } }))
    } catch {}
  }, [collapsedState])

  // Listen for external state changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed" && e.newValue !== null) {
        try {
          const newState = JSON.parse(e.newValue)
          setCollapsedState(newState)
        } catch {}
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

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
      {/* Hamburger button - always visible */}
      <button
        className="fp-hamburger"
        aria-label="Toggle sidebar"
        onClick={() => {
          setCollapsedState((s) => !s)
          setIsHovered(false)
        }}
        style={{
          position: "fixed",
          top: "14px",
          left: collapsedState ? "calc(60px - 8px)" : "calc(240px - 8px)",
          zIndex: 3001,
          background: "#ffffff",
          color: "#222222",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: "6px",
          padding: "8px 10px",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          transition: "left 260ms ease",
        }}
      >
        ☰
      </button>

      <nav
        className={`sidebar fp-sidebar ${collapsedState ? "collapsed" : ""} ${isHovered && collapsedState ? "hovered" : ""} ${mobileOpen ? "show-mobile" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-expanded={!collapsedState}
        style={{
          width: collapsedState ? "60px" : "240px",
          minWidth: collapsedState ? "60px" : "240px",
          maxWidth: collapsedState ? "60px" : "240px",
          transform: mobileOpen ? "translateX(0)" : undefined,
          transition: "width 260ms ease, min-width 260ms ease, max-width 260ms ease",
        }}
      >
        <div className="sidebar-header" style={{ padding: "20px", borderBottom: "1px solid rgba(222,226,230,0.1)" }}>
          <h2 className="logo" style={{ color: "#222222", margin: 0, fontSize: "1.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {!isCompact ? "Food Business POS" : "POS"}
          </h2>
          <p className="branch-info" style={{ color: "rgba(0,0,0,0.6)", margin: "5px 0 0 0", fontSize: "0.9rem" }}>
            {branchName} Branch • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </p>
          <div
            className="role-badge"
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
                      gap: "12px",
                      padding: collapsedState ? "10px 8px" : "10px 16px",
                      justifyContent: collapsedState ? "center" : "flex-start",
                      textDecoration: "none",
                      borderRadius: "6px",
                      transition: "background 200ms ease, color 200ms ease",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ width: "28px", textAlign: "center", flexShrink: 0 }}>
                      {item.label.split(" ")[0]}
                    </span>
                    <span style={{ display: collapsedState ? "none" : "inline" }}>
                      {item.label.split(" ").slice(1).join(" ")}
                    </span>
                  </a>
                </li>
              </RoleChecker>
            )
          })}

          <RoleChecker allowedRoles={["admin"]}>
            <li className="nav-item" style={{ marginTop: "20px", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "20px" }}>
              {!collapsedState && <div style={{ padding: "12px 20px", color: "rgba(0,0,0,0.6)", fontSize: "0.85rem", fontWeight: 600 }}>ADMIN TOOLS</div>}
            </li>
            <li className="nav-item">
              <a
                href="/admin/users"
                className="nav-link"
                onClick={(e) => { e.preventDefault(); handleNavigation("/admin/users") }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: collapsedState ? "10px 8px" : "10px 16px",
                  justifyContent: collapsedState ? "center" : "flex-start",
                  textDecoration: "none",
                  borderRadius: "6px",
                  transition: "background 200ms ease, color 200ms ease",
                }}
              >
                <span style={{ width: "28px", textAlign: "center", flexShrink: 0 }}>👥</span>
                <span style={{ display: collapsedState ? "none" : "inline" }}>User Management</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                href="/admin/settings"
                className="nav-link"
                onClick={(e) => { e.preventDefault(); handleNavigation("/admin/settings") }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: collapsedState ? "10px 8px" : "10px 16px",
                  justifyContent: collapsedState ? "center" : "flex-start",
                  textDecoration: "none",
                  borderRadius: "6px",
                  transition: "background 200ms ease, color 200ms ease",
                }}
              >
                <span style={{ width: "28px", textAlign: "center", flexShrink: 0 }}>⚙️</span>
                <span style={{ display: collapsedState ? "none" : "inline" }}>System Settings</span>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: collapsedState ? "10px 8px" : "10px 16px",
                justifyContent: collapsedState ? "center" : "flex-start",
                textDecoration: "none",
                borderRadius: "6px",
                transition: "background 200ms ease, color 200ms ease",
              }}
            >
              <span style={{ width: "28px", textAlign: "center", flexShrink: 0 }}>🚪</span>
              <span style={{ display: collapsedState ? "none" : "inline" }}>Logout</span>
            </a>
          </li>
        </ul>
      </nav>
    </>
  )
}
