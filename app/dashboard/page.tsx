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
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    loadCreditTransactions()
    loadRecentActivities()
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
    const activities = JSON.parse(localStorage.getItem("activityLog") || "[]")
    const sortedActivities = activities
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
    setRecentActivities(sortedActivities)
  }

  const getTotalCreditBalance = () => {
    return creditTransactions
      .filter((transaction) => transaction.status !== "paid")
      .reduce((sum, transaction) => sum + transaction.remainingBalance, 0)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const branchName = user.branch === "makati" ? "Makati" : user.branch === "qc" ? "QC" : "Cebu"
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
                onClick={() => setShowCreditModal(true)}
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
              <div className="summary-value">₱12,500</div>
              <div className="summary-label">Today's Sales</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">₱7,800</div>
              <div className="summary-label">COGS</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">₱4,700</div>
              <div className="summary-label">Profit Margin</div>
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
              <p style={{ margin: "0 0 10px 0", color: "#856404" }}>
                <strong>Chicken Breast:</strong> 1.2kg left (Reorder level: 5kg)
              </p>
              <p style={{ margin: 0, color: "#856404" }}>
                <strong>Garlic:</strong> 0.5kg left (Reorder level: 1kg)
              </p>
            </div>
          </div>

          {/* Top Dishes Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📊 Top 5 Dishes Sold Today</h3>
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
                    <tr>
                      <td>Chicken Adobo</td>
                      <td>45</td>
                      <td>₱5,400</td>
                    </tr>
                    <tr>
                      <td>Pork Sinigang</td>
                      <td>38</td>
                      <td>₱4,940</td>
                    </tr>
                    <tr>
                      <td>Lumpiang Shanghai</td>
                      <td>25</td>
                      <td>₱1,250</td>
                    </tr>
                    <tr>
                      <td>Halo-Halo</td>
                      <td>20</td>
                      <td>₱1,900</td>
                    </tr>
                    <tr>
                      <td>Kare-Kare</td>
                      <td>18</td>
                      <td>₱3,240</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                {/* Simple Bar Chart Visualization */}
                <div style={{ padding: "20px" }}>
                  <h4 style={{ marginBottom: "20px", color: "#2d5a27" }}>Orders Distribution</h4>
                  {[
                    { name: "Chicken Adobo", orders: 45, color: "#2d5a27" },
                    { name: "Pork Sinigang", orders: 38, color: "#4a7c59" },
                    { name: "Lumpiang Shanghai", orders: 25, color: "#6b9b76" },
                    { name: "Halo-Halo", orders: 20, color: "#8cb893" },
                    { name: "Kare-Kare", orders: 18, color: "#add5b0" },
                  ].map((dish, index) => (
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
                        <span>{dish.orders} orders</span>
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
                            background: dish.color,
                            height: "100%",
                            width: `${(dish.orders / 45) * 100}%`,
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
