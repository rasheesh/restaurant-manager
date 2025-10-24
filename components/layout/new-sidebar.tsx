"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, LayoutDashboard, UtensilsCrossed, Package, ShoppingCart, CreditCard, BarChart3, Users, Settings, LogOut } from "lucide-react"
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
  const [isOpen, setIsOpen] = useState(false)
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

  // Notify SidebarSync component when hover state changes
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("sidebar:toggled", { detail: { collapsed: !isHovered, fromHover: true } }))
    } catch {}
  }, [isHovered])

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

  const toggleSidebar = () => {
    setCollapsedState(!collapsedState)
    setIsHovered(false)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"
  const shouldExpand = !collapsedState || isHovered

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { href: "/dishes", label: "Dish & Item Management", icon: UtensilsCrossed, roles: ["admin", "supervisor"] },
    { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "supervisor"] },
    { href: "/pos", label: "Point of Sale", icon: ShoppingCart, roles: ["admin", "supervisor", "cashier"] },
    { href: "/credit", label: "Credit Management", icon: CreditCard, roles: ["admin", "supervisor"] },
    { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  ]

  const adminItems = [
    { href: "/admin/users", label: "User Management", icon: Users, roles: ["admin"] },
    { href: "/admin/settings", label: "System Settings", icon: Settings, roles: ["admin"] },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg text-white hover:opacity-90 transition-colors duration-200"
        style={{ backgroundColor: '#1e3d1a' }}
        aria-label="Toggle sidebar"
      >
        {collapsedState ? <Menu size={24} /> : <X size={24} />}
      </button>

      {/* Sidebar Container */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out z-40
          ${shouldExpand ? "w-64" : "w-20"}
          ${mobileOpen ? "translate-x-0" : ""}
        `}
        style={{
          transform: mobileOpen ? "translateX(0)" : undefined,
          position: "relative",
        }}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-sidebar-border h-24 flex items-center mt-16">
          <div className={`transition-opacity duration-300 ${shouldExpand ? "opacity-100" : "opacity-0"}`}>
            <h2 className="text-xl font-bold text-sidebar-foreground">
              Food Business POS
            </h2>
            <p className="text-sm text-sidebar-foreground/70 mt-1">
              {branchName} Branch • {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
            <div
              className="inline-block px-2 py-1 rounded-full text-xs font-semibold mt-2"
              style={{
                background: user.role === "admin" ? "#dc3545" : user.role === "supervisor" ? "#ffc107" : "#28a745",
                color: user.role === "supervisor" ? "#000" : "#fff",
              }}
            >
              {user.role.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col p-2 gap-2 overflow-y-auto h-[calc(100vh-140px)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.href
            return (
              <RoleChecker key={item.href} allowedRoles={item.roles}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    w-full px-4 py-3 rounded-lg flex items-center gap-3
                    transition-all duration-200 whitespace-nowrap
                    ${
                      isActive
                        ? "text-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                  style={isActive ? { backgroundColor: '#1e3d1a' } : {}}
                  title={item.label}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span
                    className={`font-medium transition-opacity duration-300 ${shouldExpand ? "opacity-100" : "opacity-0"}`}
                  >
                    {item.label}
                  </span>
                </button>
              </RoleChecker>
            )
          })}

          {/* Admin Tools Section */}
          <RoleChecker allowedRoles={["admin"]}>
            {shouldExpand && (
              <div className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mt-4">
                Admin Tools
              </div>
            )}
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.href
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    w-full px-4 py-3 rounded-lg flex items-center gap-3
                    transition-all duration-200 whitespace-nowrap
                    ${
                      isActive
                        ? "text-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                  style={isActive ? { backgroundColor: '#1e3d1a' } : {}}
                  title={item.label}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <span
                    className={`font-medium transition-opacity duration-300 ${shouldExpand ? "opacity-100" : "opacity-0"}`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </RoleChecker>

          {/* Logout Button */}
          <div className="mt-auto pt-4">
            <button
              onClick={() => {
                localStorage.removeItem("user")
                handleNavigation("/")
              }}
              className="w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
              title="Logout"
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span
                className={`font-medium transition-opacity duration-300 ${shouldExpand ? "opacity-100" : "opacity-0"}`}
              >
                Logout
              </span>
            </button>
          </div>
        </nav>
      </aside>
    </div>
  )
}
