"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, BarChart3 } from "lucide-react"
import Sidebar from "../../components/layout/new-sidebar"
import AuthGuard from "../../components/auth/auth-guard"

interface User {
  email: string
  branch: string
  role: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [creditTransactions, setCreditTransactions] = useState<any[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({ subtotal: 0, discount: 0, tax: 0, total: 0, orders: 0 })
  const [topItems, setTopItems] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  // initialize from persisted value so page follows Sidebar's state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "false")
    } catch {
      return false
    }
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    const parsed = JSON.parse(userData)
    setUser(parsed)
    loadCreditTransactions()
    // Use separate routes to populate dashboard (reports, orders, inventory)
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = branchNameToId[parsed.branch]
    // Kick off loaders and DB health check
    checkDbConnection()
    loadReportsForToday(branchId)
    loadInventory(branchId)
    loadOrdersForToday(branchId)
  }, [router])

  // simple DB health check - uses existing db-test route
  const checkDbConnection = () => {
    fetch('/api/db-test')
      .then(r => r.json())
      .then((d) => {
        if (d?.ok) setDbConnected(true)
        else setDbConnected(false)
      })
      .catch(() => setDbConnected(false))
  }

  const loadReportsForToday = (branchId: number | null) => {
    const today = new Date().toISOString().slice(0, 10)
    const url = branchId == null
      ? `/api/reports?from=${today}&to=${today}`
      : `/api/reports?from=${today}&to=${today}&branch_id=${branchId}`
    fetch(url)
      .then(r => r.json())
      .then((data) => {
        if (data?.summary) setSummary(data.summary)
        if (Array.isArray(data?.topItems)) setTopItems(data.topItems)
      })
      .catch(() => { /* keep existing state on error */ })
  }

  const loadInventory = (branchId: number | null) => {
    const url = branchId == null ? `/api/inventory` : `/api/inventory?branch_id=${branchId}`
    fetch(url)
      .then(r => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          const lows = rows.filter((x: any) => Number(x.quantity || 0) <= Number(x.min_threshold || 0))
          setLowStock(lows.slice(0, 10))
        }
      })
      .catch(() => { })
  }

  const loadOrdersForToday = (branchId: number | null) => {
    const today = new Date().toISOString().slice(0, 10)
    const url = branchId == null ? `/api/orders?from=${today}&to=${today}` : `/api/orders?from=${today}&to=${today}&branch_id=${branchId}`
    fetch(url)
      .then(r => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) { setRecentActivities([]); return }
        const activities = rows.slice(0, 10).map((o: any) => {
          // Prefer server-supplied local timestamp when available
          let timestampIso: string
          if (o.created_at_local) {
            // created_at_local is like 'YYYY-MM-DDTHH:mm:ss' (no timezone) and should be parsed as local
            try { timestampIso = new Date(o.created_at_local).toISOString() } catch { timestampIso = new Date().toISOString() }
          } else if (typeof o.created_at_ms === 'number') {
            timestampIso = new Date(Number(o.created_at_ms)).toISOString()
          } else {
            const raw = o.created_at
            if (!raw) timestampIso = new Date().toISOString()
            else if (typeof raw === 'string') {
              const isoLocal = raw.replace(' ', 'T')
              timestampIso = new Date(isoLocal).toISOString()
            } else {
              try { timestampIso = new Date(raw).toISOString() } catch { timestampIso = new Date().toISOString() }
            }
          }

          // Use epoch ms if available so client Date arithmetic is unambiguous
          const ts = typeof o.created_at_ms === 'number'
            ? Number(o.created_at_ms)
            : (o.created_at_local ? new Date(o.created_at_local).getTime() : Date.now())
          return {
            id: `ORD-${o.id}`,
            timestamp: ts,
            description: `Order #${String(o.order_number || '').padStart(4, '0')} - ₱${Number(o.total || 0).toFixed(2)}`,
          }
        })
        setRecentActivities(activities)
      })
      .catch(() => setRecentActivities([]))
  }

  const loadCreditTransactions = () => {
    const storedTransactions = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
    const processedTransactions = storedTransactions.map((transaction: any) => {
      const amountPaid = transaction.payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0
      const remainingBalance = transaction.amount - amountPaid
      let status = "unpaid"
      if (amountPaid > 0 && amountPaid < transaction.amount) status = "partial"
      if (amountPaid >= transaction.amount) status = "paid"
      return {
        ...transaction,
        amountPaid,
        remainingBalance,
        status
      }
    })
    setCreditTransactions(processedTransactions)
  }

  const loadRecentActivities = () => {
    // Refresh the individual loaders so everything (reports/topItems/inventory/orders) is kept in sync
    if (!user) return
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = user ? branchNameToId[(user as any).branch] : null
    loadReportsForToday(branchId)
    loadInventory(branchId)
    loadOrdersForToday(branchId)
  }

  const getTotalCreditBalance = () => {
    return creditTransactions
      .filter((transaction) => transaction.status !== "paid")
      .reduce((sum, transaction) => sum + transaction.remainingBalance, 0)
  }

  // Keep localStorage in sync with sidebar state
  useEffect(() => {
    try { 
      localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed)) 
    } catch {}
  }, [sidebarCollapsed])

  if (!user) {
    return <div>Loading...</div>
  }

  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"
  const totalCreditBalance = getTotalCreditBalance()

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div className="main-layout">
        {/* mobile overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 3000 }}
          />
        )}

        <Sidebar
          user={user}
          currentPage="/dashboard"
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
        />

        {/* Main Content */}
        <main
          className="main-content"
          style={{
            minHeight: "100vh",
            background: "#f8f9fa",
            marginLeft: "2vw",
            marginRight: "2vw",
            width: "calc(100% - 4vw)",
            transition: "margin-left 260ms ease, width 260ms ease",
          }}
        >
          {/* Top Bar */}
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}> 
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 10, background: dbConnected === null ? '#6c757d' : dbConnected ? '#28a745' : '#dc3545' }} />
                  <div style={{ color: '#6c757d', fontSize: 13 }}>{dbConnected === null ? 'DB: checking' : dbConnected ? 'DB: connected' : 'DB: disconnected'}</div>
                </div>
                <div style={{ color: "#6c757d" }}>
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-4 mb-20">
            <div className="summary-card">
              <div className="summary-value">₱{Number(summary.total || 0).toLocaleString()}</div>
              <div className="summary-label">Today's Sales</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">₱{Number(summary.tax || 0).toLocaleString()}</div>
              <div className="summary-label">Tax</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{Number(summary.orders || 0).toLocaleString()}</div>
              <div className="summary-label">Orders</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{ color: totalCreditBalance > 0 ? "#dc3545" : "#28a745" }}>
                ₱{totalCreditBalance.toLocaleString()}
              </div>
              <div className="summary-label">Outstanding Credit</div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card mb-20">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <AlertTriangle size={20} />
                Low Stock Alerts
              </h3>
            </div>
            <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "6px", border: "1px solid #ffeaa7" }}>
              {lowStock.length === 0 ? (
                <p style={{ margin: 0, color: "#856404" }}>No low stock items.</p>
              ) : (
                lowStock.map((x: any, idx: number) => (
                  <p key={idx} style={{ margin: idx === lowStock.length - 1 ? 0 : "0 0 10px 0", color: "#856404" }}>
                    <strong>{x.ingredient}:</strong> {Number(x.quantity || 0)} {x.unit || ''} left (Reorder level: {Number(x.min_threshold || 0)} {x.unit || ''})
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Top Dishes Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <BarChart3 size={20} />
                Top Dishes Sold Today
              </h3>
            </div>
            <div className="grid grid-2">
              <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.slice(0, 5).map((ti: any, idx: number) => (
                      <tr key={idx}>
                        <td>{ti.name}</td>
                        <td>{Number(ti.qty || 0)}</td>
                        <td>₱{Number(ti.revenue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {topItems.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "#6c757d", textAlign: 'center' }}>No sales yet today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                {/* Simple Bar Chart Visualization */}
                <div style={{ padding: "20px" }}>
                  <h4 style={{ marginBottom: "20px", color: "#2d5a27" }}>Orders Distribution</h4>
                  {topItems.slice(0, 5).map((dish: any, index: number) => (
                    <div key={index} style={{ marginBottom: "15px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "5px",
                          fontSize: "14px",
                        }}
                      >
                        <span>{dish.name}</span>
                        <span>{Number(dish.qty || 0)} orders</span>
                      </div>
                      <div
                        style={{
                          background: "#e9ecef",
                          height: "8px",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            background: "#2d5a27",
                            height: "100%",
                            width: `${(Number(dish.qty || 0) / Math.max(1, Number(topItems?.[0]?.qty || 1))) * 100}%`,
                            borderRadius: "4px",
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ marginTop: "20px" }}>
            <div className="card-header">
              <h3 className="card-title"> Recent Activities</h3>
            </div>
            <div>
              {recentActivities.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6c757d" }}>
                  <p>No recent activities found.</p>
                  <p style={{ fontSize: "0.9rem" }}>Activities will appear here as users interact with the system.</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "10px 0",
                      borderBottom: index < recentActivities.length - 1 ? "1px solid #e9ecef" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{activity.description}</span>
                      <span style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                        {(() => {
                          // Debug: show raw timestamp, parsed date, and epoch ms
                          try {
                            const rawTs = activity.timestamp
                            const parsed = new Date(rawTs)
                            console.debug('recent activity time debug', { rawTs, parsed, parsed_ms: parsed.getTime(), now_ms: Date.now() })
                          } catch (err) {
                            console.debug('recent activity debug parse error', err, activity.timestamp)
                          }
                          const activityTime = new Date(activity.timestamp)
                          const now = new Date()
                          const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60))

                          if (diffInMinutes < 1) return "Just now"
                          if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`

                          const diffInHours = Math.floor(diffInMinutes / 60)
                          if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`

                          const diffInDays = Math.floor(diffInHours / 24)
                          return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
                        })()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
