import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import "../../styles/sidebar.css" // ensure styles are loaded

const Sidebar = ({ user, currentPage, collapsed, mobileOpen }: { user: any, currentPage: string, collapsed?: boolean, mobileOpen?: boolean }) => {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  // compute visual state
  const isCompact = Boolean(collapsed) && !isHovered
  const widthFull = 240
  const widthCompact = 60
  const width = isCompact ? widthCompact : widthFull
  const transform = mobileOpen ? "translateX(0)" : undefined // used on mobile overlay only

  return (
    <nav
      // keep original class for any existing styling but add fp-sidebar for uniqueness
      className={`sidebar fp-sidebar ${isCompact ? "collapsed" : ""} ${isHovered && collapsed ? "hovered" : ""} ${mobileOpen ? "show-mobile" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-expanded={!isCompact}
      style={{
        // inline styles have highest priority and will prevent other CSS from forcing a different width
        width: `${width}px`,
        minWidth: `${width}px`,
        transition: "width 260ms ease, transform 260ms ease",
        transform,
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        overflow: "hidden",
        background: "#2d5a27",
        color: "white",
        zIndex: 1000,
      }}
    >
      <div className="sidebar-content" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Logo and Brand Name */}
        <div className="sidebar-header" onClick={() => handleNavigation("/dashboard")} style={{ cursor: "pointer", padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2d5a27", fontWeight: 700 }}>
            P
          </div>
          <h2 className="logo" style={{ margin: 0, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{!isCompact ? "POS System" : ""}</h2>
        </div>

        {/* Navigation Links */}
        <ul className="nav-list" style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
          <li className={`nav-item ${currentPage === "/dashboard" ? "active" : ""}`} onClick={() => handleNavigation("/dashboard")}>
            <span className="icon">🏠</span>
            <span className="text">{!isCompact ? "Dashboard" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/orders" ? "active" : ""}`} onClick={() => handleNavigation("/orders")}>
            <span className="icon">📦</span>
            <span className="text">{!isCompact ? "Orders" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/menu" ? "active" : ""}`} onClick={() => handleNavigation("/menu")}>
            <span className="icon">🍽️</span>
            <span className="text">{!isCompact ? "Menu" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/inventory" ? "active" : ""}`} onClick={() => handleNavigation("/inventory")}>
            <span className="icon">📊</span>
            <span className="text">{!isCompact ? "Inventory" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/customers" ? "active" : ""}`} onClick={() => handleNavigation("/customers")}>
            <span className="icon">👥</span>
            <span className="text">{!isCompact ? "Customers" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/reports" ? "active" : ""}`} onClick={() => handleNavigation("/reports")}>
            <span className="icon">📈</span>
            <span className="text">{!isCompact ? "Reports" : ""}</span>
          </li>
          <li className={`nav-item ${currentPage === "/settings" ? "active" : ""}`} onClick={() => handleNavigation("/settings")}>
            <span className="icon">⚙️</span>
            <span className="text">{!isCompact ? "Settings" : ""}</span>
          </li>
        </ul>

        {/* User Info and Logout */}
        <div className="user-info" style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="user-details" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="user-name" style={{ fontSize: 13 }}>{!isCompact ? user?.name : ""}</span>
            <span className="user-role" style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{!isCompact ? user?.role : ""}</span>
          </div>
          <button className="btn-logout" onClick={() => { /* handle logout */ }} style={{ marginTop: 10, width: "100%", padding: "8px", fontSize: 13 }}>
            {!isCompact ? "Logout" : "⎋"}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Sidebar