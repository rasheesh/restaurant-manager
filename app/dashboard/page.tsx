"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/layout/sidebar"
import AuthGuard from "../../components/auth/auth-guard"
import CreditManagementModal from "../../components/credit-management-modal"

interface User {
  email: string
  branch: string
  role: string
}

interface CreditTransaction {
  id: number
  orderNumber: number
  customerName: string
  customerContact: string
  amount: number
  amountPaid: number
  remainingBalance: number
  timestamp: Date
  status: "unpaid" | "partial" | "paid"
  cashier: string
  payments: Payment[]
}

interface Payment {
  id: number
  amount: number
  timestamp: Date
  cashier: string
  method: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({ subtotal: 0, discount: 0, tax: 0, total: 0, orders: 0 })
  const [topItems, setTopItems] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
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
    loadRecentActivities()
    // Load reports and low stock
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = branchNameToId[parsed.branch]
    const today = new Date().toISOString().slice(0, 10)
    const reportsUrl = branchId == null
      ? `/api/reports?from=${today}&to=${today}`
      : `/api/reports?from=${today}&to=${today}&branch_id=${branchId}`
    fetch(reportsUrl)
      .then(r => r.json())
      .then((data) => {
        if (data?.summary) setSummary(data.summary)
        if (Array.isArray(data?.topItems)) setTopItems(data.topItems)
      })
      .catch(() => {})
    const invUrl = branchId == null ? `/api/inventory` : `/api/inventory?branch_id=${branchId}`
    fetch(invUrl)
      .then(r => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          const lows = rows.filter((x: any) => Number(x.quantity || 0) <= Number(x.min_threshold || 0))
          setLowStock(lows.slice(0, 10))
        }
      })
      .catch(() => {})
  }, [router])

  const loadCreditTransactions = () => {
    const storedTransactions = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
    const processedTransactions = storedTransactions.map((transaction: any) => ({
      ...transaction,
      timestamp: new Date(transaction.timestamp),
      amountPaid: transaction.payments?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0,
      remainingBalance:
        transaction.amount -
        (transaction.payments?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0),
      status: (() => {
        const paid = transaction.payments?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0
        if (paid === 0) return "unpaid"
        if (paid >= transaction.amount) return "paid"
        return "partial"
      })(),
      payments: transaction.payments || [],
    }))
    setCreditTransactions(processedTransactions)
  }

  const loadRecentActivities = () => {
    const today = new Date().toISOString().slice(0,10)
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = user ? branchNameToId[(user as any).branch] : null
    const url = branchId == null ? `/api/orders?from=${today}&to=${today}` : `/api/orders?from=${today}&to=${today}&branch_id=${branchId}`
    fetch(url)
      .then(r=>r.json())
      .then((rows)=>{
        if (!Array.isArray(rows)) { setRecentActivities([]); return }
        const activities = rows.slice(0,10).map((o:any)=>({
          id: `ORD-${o.id}`,
          timestamp: o.created_at || new Date().toISOString(),
          description: `Order #${String(o.order_number||'').padStart(4,'0')} - ₱${Number(o.total||0).toFixed(2)}`,
        }))
        setRecentActivities(activities)
      })
      .catch(()=>setRecentActivities([]))
  }

  const getTotalCreditBalance = () => {
    return creditTransactions
      .filter((transaction) => transaction.status !== "paid")
      .reduce((sum, transaction) => sum + transaction.remainingBalance, 0)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"
  const totalCreditBalance = getTotalCreditBalance()
  const outstandingCredits = creditTransactions.filter((t) => t.status !== "paid").length

  return (
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <div className="main-layout">
        {/* Sidebar Navigation */}
        <Sidebar user={user} currentPage="/dashboard" />

        {/* Main Content */}
        <main className="main-content">
          {/* Top Bar */}
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Dashboard</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: "14px" }}
                onClick={() => {
                  setShowCreditModal(true)
                  // Refresh credit transactions when opening modal
                  setTimeout(() => loadCreditTransactions(), 100)
                }}
              >
                💳 Credit Management
              </button>
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

          {totalCreditBalance > 0 && (
            <div className="card mb-20">
              <div className="card-header">
                <h3 className="card-title">💳 Credit Status Alert</h3>
              </div>
              <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "6px", border: "1px solid #ffeaa7" }}>
                <p style={{ margin: "0 0 10px 0", color: "#856404" }}>
                  <strong>Outstanding Credit Balance:</strong> ₱{totalCreditBalance.toFixed(2)}
                </p>
                <p style={{ margin: "0 0 15px 0", color: "#856404" }}>
                  <strong>Pending Transactions:</strong> {outstandingCredits} customer(s) with unpaid balances
                </p>
                <button
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "14px" }}
                  onClick={() => setShowCreditModal(true)}
                >
                  Manage Credit Payments
                </button>
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          <div className="card mb-20">
            <div className="card-header">
              <h3 className="card-title">⚠️ Low Stock Alerts</h3>
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
              <h3 className="card-title">📊 Top Dishes Sold Today</h3>
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
                    {topItems.slice(0,5).map((ti: any, idx: number) => (
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
                  {topItems.slice(0,5).map((dish: any, index: number) => (
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
              <h3 className="card-title">🕒 Recent Activity</h3>
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

        <CreditManagementModal
          isOpen={showCreditModal}
          onClose={() => {
            setShowCreditModal(false)
            loadCreditTransactions() // Reload data when modal closes
          }}
          user={user}
        />
      </div>
    </AuthGuard>
  )
}
