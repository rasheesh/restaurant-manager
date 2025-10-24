"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import Sidebar from "../../components/layout/new-sidebar"
import AuthGuard from "../../components/auth/auth-guard"
import RoleChecker from "../../components/auth/role-checker"

interface User {
  email: string
  branch: string
  role: string
}

interface BranchSales {
  branch: string
  sales: number
  orders: number
  avgOrderValue: number
}

interface DishSales {
  name: string
  quantity: number
  revenue: number
  profit: number
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

interface SoldOutItem {
  dishName: string
  count: number
  lastMarkedSoldOut: Date
}

interface DateRange {
  start: string
  end: string
}

interface SalesTransaction {
  id: string
  receiptNo: string
  dateTime: Date
  cashier: string
  customer?: string
  paymentMethod: string
  totalAmount: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  orderType: "dine-in" | "takeout" | "combo"
}

interface Activity {
  id: string
  timestamp: string
  type: string
  description: string
  user: string
  metadata?: any
}

const sampleBranchSales: BranchSales[] = []

const sampleDishSales: DishSales[] = []

const monthlySalesData: any[] = []

const sampleSalesTransactions: SalesTransaction[] = []

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today")
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [soldOutItems, setSoldOutItems] = useState<SoldOutItem[]>([])
  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([])
  const [reportsSummary, setReportsSummary] = useState<any>({ total: 0, orders: 0, tax: 0, discount: 0, subtotal: 0 })
  const [reportsTopItems, setReportsTopItems] = useState<any[]>([])
  const [reportsPayments, setReportsPayments] = useState<any[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<SalesTransaction | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([])
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all")
  const [activityUserFilter, setActivityUserFilter] = useState<string>("all")
  const [activitySearchTerm, setActivitySearchTerm] = useState<string>("")
  const [activityDateFilter, setActivityDateFilter] = useState<string>("all")
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  
  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "false")
    } catch {
      return false
    }
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role === "cashier") {
      router.push("/pos")
      return
    }
    setUser(parsedUser)
    loadCreditTransactions()
    loadSoldOutData()
    refetchAll(parsedUser, selectedPeriod, dateRange)
  }, [router])

  // Keep localStorage in sync with sidebar state
  useEffect(() => {
    try { 
      localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed)) 
    } catch {}
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!user) return
    refetchAll(user, selectedPeriod, dateRange)
  }, [selectedPeriod, dateRange.start, dateRange.end])

  const computeRange = (period: string, custom: DateRange): { start: string; end: string } => {
    const today = new Date()
    const pad = (n:number)=> String(n).padStart(2,'0')
    const iso = (d:Date)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    if (period === 'today') {
      const s = iso(today); return { start: s, end: s }
    }
    if (period === 'week') {
      const s = new Date(today); s.setDate(s.getDate()-6); return { start: iso(s), end: iso(today) }
    }
    if (period === 'month') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1); return { start: iso(s), end: iso(today) }
    }
    return { start: custom.start, end: custom.end }
  }

  const refetchAll = (u: any, period: string, custom: DateRange) => {
    setErrorMsg("")
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = branchNameToId[u.branch]
    const range = computeRange(period, custom)

    const repUrl = branchId == null
      ? `/api/reports?from=${range.start}&to=${range.end}`
      : `/api/reports?from=${range.start}&to=${range.end}&branch_id=${branchId}`
    setLoadingReports(true)
    fetch(repUrl)
      .then(async (r)=>{ if(!r.ok) throw new Error((await r.json())?.error || 'Failed to load reports'); return r.json() })
      .then((data)=>{
        setReportsSummary(data?.summary || { total:0, orders:0, tax:0, discount:0, subtotal:0 })
        setReportsTopItems(Array.isArray(data?.topItems)? data.topItems : [])
        setReportsPayments(Array.isArray(data?.payments)? data.payments : [])
      })
      .catch((e:any)=>{ setReportsSummary({ total:0, orders:0, tax:0, discount:0, subtotal:0 }); setReportsTopItems([]); setReportsPayments([]); setErrorMsg(e?.message || 'Failed to load reports') })
      .finally(()=> setLoadingReports(false))

    const ordUrl = branchId == null
      ? `/api/orders?from=${range.start}&to=${range.end}`
      : `/api/orders?from=${range.start}&to=${range.end}&branch_id=${branchId}`
    setLoadingOrders(true)
    fetch(ordUrl)
      .then(r=>r.json())
      .then((rows)=>{
        if (!Array.isArray(rows)) { setSalesTransactions([]); setActivities([]); return }
        const mapped = rows.map((o:any)=>({
          id: `TXN-${o.id}`,
          receiptNo: `RCP-${new Date(o.created_at || Date.now()).getFullYear()}-${String(o.order_number||0).padStart(4,'0')}`,
          dateTime: new Date(o.created_at || Date.now()),
          cashier: '',
          customer: undefined,
          paymentMethod: (o.payment_method || '').toString().toUpperCase().replace(/^./, (c:string)=>c.toUpperCase()),
          totalAmount: Number(o.total || 0),
          referenceNumber: undefined,
          items: [],
          orderType: 'takeout',
        }))
        setSalesTransactions(mapped)
        const acts = rows.slice(0, 50).map((o:any)=>({ id: `ORD-${o.id}`, timestamp: o.created_at || new Date().toISOString(), type: 'order', description: `Order #${String(o.order_number||'').padStart(4,'0')} - ₱${Number(o.total||0).toFixed(2)}`, user: 'system' }))
        setActivities(acts)
        setFilteredActivities(acts)
      })
      .catch(()=>{ setSalesTransactions([]); setActivities([]); setFilteredActivities([]) })
      .finally(()=> setLoadingOrders(false))
  }

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

  const loadSoldOutData = () => {
    fetch('/api/items')
      .then(r=>r.json())
      .then((rows)=>{
        if (!Array.isArray(rows)) { setSoldOutItems([]); return }
        const sold = rows.filter((x:any)=>!x.available).map((x:any)=>({
          id: x.id,
          name: x.name,
          lastMarkedSoldOut: new Date(x.updated_at || Date.now()),
        }))
        setSoldOutItems(sold)
      })
      .catch(()=>setSoldOutItems([]))
  }

  const loadSalesTransactions = () => {
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: null }
    const branchId = user ? (branchNameToId[user.branch]) : null
    const start = new Date().toISOString().slice(0,10)
    const end = start
    const url = branchId == null ? `/api/orders?from=${start}&to=${end}` : `/api/orders?from=${start}&to=${end}&branch_id=${branchId}`
    fetch(url)
      .then(r=>r.json())
      .then((rows)=>{
        if (!Array.isArray(rows)) { setSalesTransactions([]); return }
        const mapped = rows.map((o:any)=>({
          id: `TXN-${o.id}`,
          receiptNo: `RCP-${new Date(o.created_at || Date.now()).getFullYear()}-${String(o.order_number||0).padStart(4,'0')}`,
          dateTime: new Date(o.created_at || Date.now()),
          cashier: '',
          customer: undefined,
          paymentMethod: '',
          totalAmount: Number(o.total || 0),
          referenceNumber: undefined,
          items: [],
          orderType: "takeout" as "takeout",
        }))
        setSalesTransactions(mapped)
      })
      .catch(()=>setSalesTransactions([]))
  }

  const loadActivityLogs = () => { /* replaced by refetchAll -> orders */ }

  const viewTransactionDetails = (transaction: SalesTransaction) => {
    setSelectedTransaction(transaction)
    setShowTransactionModal(true)
  }

  const filterActivities = () => {
    let filtered = [...activities]

    // Filter by type
    if (activityTypeFilter !== "all") {
      filtered = filtered.filter((activity) => activity.type === activityTypeFilter)
    }

    // Filter by user
    if (activityUserFilter !== "all") {
      filtered = filtered.filter((activity) => activity.user === activityUserFilter)
    }

    // Filter by search term
    if (activitySearchTerm.trim()) {
      const searchLower = activitySearchTerm.toLowerCase()
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(searchLower) ||
          activity.type.toLowerCase().includes(searchLower) ||
          activity.user.toLowerCase().includes(searchLower) ||
          activity.id.toLowerCase().includes(searchLower),
      )
    }

    // Filter by date
    if (activityDateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.timestamp)

        switch (activityDateFilter) {
          case "today":
            return activityDate >= today
          case "yesterday":
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            return activityDate >= yesterday && activityDate < today
          case "week":
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return activityDate >= weekAgo
          case "month":
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return activityDate >= monthAgo
          default:
            return true
        }
      })
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setFilteredActivities(filtered)
  }

  useEffect(() => {
    filterActivities()
  }, [activities, activityTypeFilter, activityUserFilter, activitySearchTerm, activityDateFilter])

  const getUniqueActivityTypes = () => {
    const types = [...new Set(activities.map((activity) => activity.type))]
    return types.sort()
  }

  const getUniqueUsers = () => {
    const users = [...new Set(activities.map((activity) => activity.user))]
    return users.sort()
  }

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "order":
        return { bg: "#d4edda", color: "#155724" }
      case "payment":
        return { bg: "#cce5ff", color: "#004085" }
      case "inventory":
        return { bg: "#fff3cd", color: "#856404" }
      case "user":
        return { bg: "#e2e3e5", color: "#383d41" }
      case "system":
        return { bg: "#f8d7da", color: "#721c24" }
      case "auth":
        return { bg: "#d1ecf1", color: "#0c5460" }
      default:
        return { bg: "#f8f9fa", color: "#495057" }
    }
  }

  const getTotalCreditBalance = () => {
    return creditTransactions
      .filter((transaction) => transaction.status !== "paid")
      .reduce((sum, transaction) => sum + transaction.remainingBalance, 0)
  }

  const getTopSoldOutItems = () => {
    return soldOutItems.sort((a, b) => b.count - a.count).slice(0, 5)
  }

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ height: 16, width: 240, background:'#e9ecef', borderRadius:6, marginBottom:12 }} />
        <div className="grid grid-4 mb-20">
          {Array.from({ length: 4 }).map((_,i)=> (
            <div key={i} style={{ height: 80, background:'#f8f9fa', border:'1px solid #e9ecef', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    )
  }

  const totalSales = Number(reportsSummary.total || 0)
  const totalOrders = Number(reportsSummary.orders || 0)
  const totalProfit = Number(reportsSummary.total || 0) - Number(reportsSummary.subtotal || 0) + 0
  const totalCreditBalance = getTotalCreditBalance()
  const topSoldOutItems = getTopSoldOutItems()

  const isAdmin = user.role === "admin"
  const currentBranchData = []

  return (
    <AuthGuard allowedRoles={["admin", "supervisor"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/reports" />

        <main
          className="main-content"
          style={{
            marginLeft: "2vw",
            marginRight: "2vw",
            width: "calc(100% - 4vw)",
            transition: "margin-left 260ms ease, width 260ms ease",
          }}
        >
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>
              Reports {!isAdmin && `- ${user.branch.charAt(0).toUpperCase() + user.branch.slice(1)} Branch`}
            </h1>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                className="form-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{ width: "auto", minWidth: "120px" }}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              {selectedPeriod === "custom" && (
                <>
                  <input
                    type="date"
                    className="form-input"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    style={{ width: "auto" }}
                  />
                  <input
                    type="date"
                    className="form-input"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    style={{ width: "auto" }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "5px", borderBottom: "1px solid #dee2e6" }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "sales", label: "Sales Analysis" },
                { id: "dishes", label: "Dish Performance" },
                { id: "saleshistory", label: "Sales History" }, // Added Sales History tab
                { id: "credit", label: "Credit Tracking" },
                { id: "soldout", label: "Sold Out Analytics" },
                { id: "logs", label: "Activity Logs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    borderRadius: "8px 8px 0 0",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid #2d5a27" : "2px solid transparent",
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <RoleChecker allowedRoles={["admin"]}>
                <button
                  className={`btn ${activeTab === "branches" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    borderRadius: "8px 8px 0 0",
                    border: "none",
                    borderBottom: activeTab === "branches" ? "2px solid #2d5a27" : "2px solid transparent",
                  }}
                  onClick={() => setActiveTab("branches")}
                >
                  Branch Comparison
                </button>
              </RoleChecker>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-4 mb-20">
                <div className="summary-card">
                  <div className="summary-value">₱{totalSales.toLocaleString()}</div>
                  <div className="summary-label">Total Sales</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{totalOrders}</div>
                  <div className="summary-label">Total Orders</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">₱{totalProfit.toLocaleString()}</div>
                  <div className="summary-label">Total Profit</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: totalCreditBalance > 0 ? "#dc3545" : "#28a745" }}>
                    ₱{totalCreditBalance.toLocaleString()}
                  </div>
                  <div className="summary-label">Outstanding Credit</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-2 mb-20">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Sales Trend</h3>
                  </div>
                  <div style={{ padding: "20px" }}>
                    {monthlySalesData.length === 0 && (
                      <div style={{ color: '#6c757d' }}>No trend data</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Key Metrics</h3>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span>Profit Margin</span>
                        <span style={{ fontWeight: "600", color: "#28a745" }}>
                          {((totalProfit / totalSales) * 100).toFixed(1)}%
                        </span>
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
                            background: "#28a745",
                            height: "100%",
                            width: `${(totalProfit / totalSales) * 100}%`,
                            borderRadius: "4px",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span>Best Performing Dish</span>
                        <span style={{ fontWeight: "600", color: "#2d5a27" }}>
                          {reportsTopItems?.[0]?.name || 'No data'}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                        {reportsTopItems?.[0] ? (
                          <>₱{Number(reportsTopItems[0].revenue||0).toLocaleString()} • {Number(reportsTopItems[0].qty||0)} orders</>
                        ) : '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span>Credit Balance Status</span>
                        <span style={{ fontWeight: "600", color: totalCreditBalance > 0 ? "#dc3545" : "#28a745" }}>
                          {totalCreditBalance > 0 ? "Outstanding" : "All Clear"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                        {creditTransactions.filter((t) => t.status !== "paid").length} pending transactions
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sales Analysis Tab */}
          {activeTab === "sales" && (
            <div className="grid grid-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Top Items</h3>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Qty</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsTopItems.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: '#6c757d', textAlign: 'center' }}>No data</td>
                      </tr>
                    )}
                    {reportsTopItems.map((it:any, idx:number)=> (
                      <tr key={idx}>
                        <td>{it.name}</td>
                        <td>{Number(it.qty||0)}</td>
                        <td>₱{Number(it.revenue||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Payments</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  {reportsPayments.length === 0 && <div style={{ color: '#6c757d' }}>No data</div>}
                  {reportsPayments.map((p:any, index:number)=>{
                    const totalAmount = reportsPayments.reduce((s:number,x:any)=> s + Number(x.amount||0), 0)
                    const percentage = totalAmount ? Math.round((Number(p.amount||0)/totalAmount)*100) : 0
                    return (
                      <div key={p.method} style={{ marginBottom: 20 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 5 }}>
                          <span style={{ fontWeight: 600 }}>{p.method?.toUpperCase?.() || 'UNKNOWN'}</span>
                          <span>{percentage}% • ₱{Number(p.amount||0).toLocaleString()}</span>
                        </div>
                        <div style={{ background:'#e9ecef', height: 8, borderRadius: 4, overflow:'hidden' }}>
                          <div style={{ background: index===0?'#2d5a27': index===1?'#4a7c59':'#6b9b76', height:'100%', width: `${percentage}%`, borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Dish Performance Tab */}
          {activeTab === "dishes" && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Dish Performance</h3>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dish Name</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsTopItems.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ color: '#6c757d', textAlign: 'center' }}>No data</td>
                    </tr>
                  )}
                  {reportsTopItems.map((it:any)=> (
                    <tr key={it.item_id || it.name}>
                      <td style={{ fontWeight: 600 }}>{it.name}</td>
                      <td>{Number(it.qty||0)}</td>
                      <td>₱{Number(it.revenue||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sales History Tab */}
          {activeTab === "saleshistory" && (
            <>
              <div className="grid grid-4 mb-20">
                <div className="summary-card">
                  <div className="summary-value">{salesTransactions.length}</div>
                  <div className="summary-label">Total Transactions</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">
                    ₱{salesTransactions.reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString()}
                  </div>
                  <div className="summary-label">Total Revenue</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">
                    ₱
                    {(
                      salesTransactions.reduce((sum, t) => sum + t.totalAmount, 0) / salesTransactions.length || 0
                    ).toFixed(0)}
                  </div>
                  <div className="summary-label">Average Transaction</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">
                    {salesTransactions.filter((t) => t.paymentMethod === "Cash").length}
                  </div>
                  <div className="summary-label">Cash Transactions</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Sales Transaction History</h3>
                  <p style={{ color: "#6c757d", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Complete record of all sales transactions with detailed information
                  </p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Receipt No.</th>
                        <th>Date & Time</th>
                        <th>Cashier</th>
                        <th>Payment Method</th>
                        <th>Total Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesTransactions
                        .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
                        .map((transaction) => (
                          <tr key={transaction.id}>
                            <td style={{ fontWeight: "600", color: "#2d5a27" }}>{transaction.receiptNo}</td>
                            <td>
                              <div>{transaction.dateTime.toLocaleDateString("en-PH")}</div>
                              <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                                {transaction.dateTime.toLocaleTimeString("en-PH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </td>
                            <td>{transaction.cashier}</td>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  background:
                                    transaction.paymentMethod === "Cash"
                                      ? "#d4edda"
                                      : transaction.paymentMethod === "Card"
                                        ? "#cce5ff"
                                        : transaction.paymentMethod === "GCash"
                                          ? "#fff3cd"
                                          : transaction.paymentMethod === "PayMaya"
                                            ? "#e2e3e5"
                                            : "#f8f9fa",
                                  color:
                                    transaction.paymentMethod === "Cash"
                                      ? "#155724"
                                      : transaction.paymentMethod === "Card"
                                        ? "#004085"
                                        : transaction.paymentMethod === "GCash"
                                          ? "#856404"
                                          : transaction.paymentMethod === "PayMaya"
                                            ? "#383d41"
                                            : "#495057",
                                }}
                              >
                                {transaction.paymentMethod}
                              </span>
                            </td>
                            <td style={{ fontWeight: "600", color: "#2d5a27" }}>
                              ₱{transaction.totalAmount.toFixed(2)}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => viewTransactionDetails(transaction)}
                                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                              >
                                View Info
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "logs" && (
            <>
              <div className="grid grid-4 mb-20">
                <div className="summary-card">
                  <div className="summary-value">{activities.length}</div>
                  <div className="summary-label">Total Activities</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{filteredActivities.length}</div>
                  <div className="summary-label">Filtered Results</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{getUniqueActivityTypes().length}</div>
                  <div className="summary-label">Activity Types</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{getUniqueUsers().length}</div>
                  <div className="summary-label">Active Users</div>
                </div>
              </div>

              {/* Filters */}
              <div className="card mb-20">
                <div className="card-header">
                  <h3 className="card-title">Activity Filters</h3>
                  <p style={{ color: "#6c757d", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Filter and search through system activities to find specific events
                  </p>
                </div>
                <div style={{ padding: "20px" }}>
                  <div className="grid grid-4" style={{ gap: "15px", marginBottom: "15px" }}>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#495057" }}>
                        Activity Type
                      </label>
                      <select
                        className="form-select"
                        value={activityTypeFilter}
                        onChange={(e) => setActivityTypeFilter(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="all">All Types</option>
                        {getUniqueActivityTypes().map((type) => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#495057" }}>
                        User
                      </label>
                      <select
                        className="form-select"
                        value={activityUserFilter}
                        onChange={(e) => setActivityUserFilter(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="all">All Users</option>
                        {getUniqueUsers().map((user) => (
                          <option key={user} value={user}>
                            {user}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#495057" }}>
                        Time Period
                      </label>
                      <select
                        className="form-select"
                        value={activityDateFilter}
                        onChange={(e) => setActivityDateFilter(e.target.value)}
                        style={{ width: "100%" }}
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "5px", color: "#495057" }}>
                        Search
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search activities..."
                        value={activitySearchTerm}
                        onChange={(e) => setActivitySearchTerm(e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setActivityTypeFilter("all")
                        setActivityUserFilter("all")
                        setActivityDateFilter("all")
                        setActivitySearchTerm("")
                      }}
                      style={{ fontSize: "0.9rem" }}
                    >
                      Clear All Filters
                    </button>
                    <span style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                      Showing {filteredActivities.length} of {activities.length} activities
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">System Activity Log</h3>
                  <p style={{ color: "#6c757d", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Comprehensive log of all system activities including orders, payments, and user actions
                  </p>
                </div>
                {filteredActivities.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                    {activities.length === 0 ? (
                      <>
                        <p>No activities recorded yet.</p>
                        <p style={{ fontSize: "0.9rem" }}>
                          Activities will appear here as users interact with the system.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>No activities match your current filters.</p>
                        <p style={{ fontSize: "0.9rem" }}>
                          Try adjusting your filters or clearing them to see more results.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Activity ID</th>
                          <th>Date & Time</th>
                          <th>Type</th>
                          <th>User</th>
                          <th>Description</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.map((activity) => {
                          const typeColor = getActivityTypeColor(activity.type)
                          return (
                            <tr key={activity.id}>
                              <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#6c757d" }}>
                                {activity.id}
                              </td>
                              <td>
                                <div>{new Date(activity.timestamp).toLocaleDateString("en-PH")}</div>
                                <div style={{ fontSize: "0.85rem", color: "#6c757d" }}>
                                  {new Date(activity.timestamp).toLocaleTimeString("en-PH", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    background: typeColor.bg,
                                    color: typeColor.color,
                                  }}
                                >
                                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                                </span>
                              </td>
                              <td style={{ fontWeight: "600" }}>{activity.user}</td>
                              <td style={{ maxWidth: "300px", wordWrap: "break-word" }}>{activity.description}</td>
                              <td>
                                {activity.metadata && (
                                  <details style={{ cursor: "pointer" }}>
                                    <summary style={{ fontSize: "0.8rem", color: "#007bff" }}>View Details</summary>
                                    <div
                                      style={{
                                        marginTop: "8px",
                                        padding: "8px",
                                        backgroundColor: "#f8f9fa",
                                        borderRadius: "4px",
                                        fontSize: "0.8rem",
                                        fontFamily: "monospace",
                                        maxWidth: "250px",
                                        overflow: "auto",
                                      }}
                                    >
                                      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                                        {JSON.stringify(activity.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  </details>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "credit" && (
            <>
              <div className="grid grid-4 mb-20">
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#dc3545" }}>
                    ₱{totalCreditBalance.toFixed(2)}
                  </div>
                  <div className="summary-label">Total Outstanding</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#ffc107" }}>
                    {creditTransactions.filter((t) => t.status === "unpaid").length}
                  </div>
                  <div className="summary-label">Unpaid Transactions</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#fd7e14" }}>
                    {creditTransactions.filter((t) => t.status === "partial").length}
                  </div>
                  <div className="summary-label">Partial Payments</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#28a745" }}>
                    {creditTransactions.filter((t) => t.status === "paid").length}
                  </div>
                  <div className="summary-label">Fully Paid</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Credit Balance Summary</h3>
                </div>
                {creditTransactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                    <p>No credit transactions found.</p>
                    <p style={{ fontSize: "0.9rem" }}>
                      Credit transactions will appear here when customers use "Utang Muna" payment option.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Total Amount</th>
                          <th>Amount Paid</th>
                          <th>Remaining Balance</th>
                          <th>Status</th>
                          <th>Last Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditTransactions
                          .filter((transaction) => transaction.status !== "paid")
                          .map((transaction) => (
                            <tr key={transaction.id}>
                              <td style={{ fontWeight: "600" }}>{transaction.customerName}</td>
                              <td>{transaction.customerContact}</td>
                              <td>₱{transaction.amount.toFixed(2)}</td>
                              <td style={{ color: "#28a745" }}>₱{transaction.amountPaid.toFixed(2)}</td>
                              <td
                                style={{
                                  color: transaction.remainingBalance > 0 ? "#dc3545" : "#28a745",
                                  fontWeight: "600",
                                }}
                              >
                                ₱{transaction.remainingBalance.toFixed(2)}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    background:
                                      transaction.status === "paid"
                                        ? "#d4edda"
                                        : transaction.status === "partial"
                                          ? "#fff3cd"
                                          : "#f8d7da",
                                    color:
                                      transaction.status === "paid"
                                        ? "#155724"
                                        : transaction.status === "partial"
                                          ? "#856404"
                                          : "#721c24",
                                  }}
                                >
                                  {transaction.status === "paid" && "✅ Paid"}
                                  {transaction.status === "partial" && (
                                    <span className="flex items-center gap-1">
                                      <AlertTriangle size={14} />
                                      Partial
                                    </span>
                                  )}
                                  {transaction.status === "unpaid" && "❌ Unpaid"}
                                </span>
                              </td>
                              <td>
                                {transaction.payments.length > 0
                                  ? new Date(
                                    Math.max(...transaction.payments.map((p) => new Date(p.timestamp).getTime())),
                                  ).toLocaleDateString("en-PH")
                                  : "No payments"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "soldout" && (
            <>
              <div className="grid grid-3 mb-20">
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#dc3545" }}>
                    {soldOutItems.length}
                  </div>
                  <div className="summary-label">Items Tracked</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#ffc107" }}>
                    {soldOutItems.reduce((sum, item) => sum + item.count, 0)}
                  </div>
                  <div className="summary-label">Total Sold Out Events</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value" style={{ color: "#28a745" }}>
                    {topSoldOutItems.length > 0 ? topSoldOutItems[0].dishName : "N/A"}
                  </div>
                  <div className="summary-label">Most Sold Out Item</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Top 5 Most Sold Out Items</h3>
                  <p style={{ color: "#6c757d", fontSize: "0.9rem", margin: "8px 0 0 0" }}>
                    Items ranked by frequency of being marked as sold out
                  </p>
                </div>
                {topSoldOutItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                    <p>No sold out data available.</p>
                    <p style={{ fontSize: "0.9rem" }}>
                      Data will appear here when items are marked as sold out in the POS system.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Dish Name</th>
                          <th>Times Sold Out</th>
                          <th>Last Sold Out</th>
                          <th>Frequency Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSoldOutItems.map((item, index) => (
                          <tr key={item.dishName}>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "50%",
                                  background:
                                    index === 0
                                      ? "#ffd700"
                                      : index === 1
                                        ? "#c0c0c0"
                                        : index === 2
                                          ? "#cd7f32"
                                          : "#e9ecef",
                                  color: index < 3 ? "white" : "#6c757d",
                                  textAlign: "center",
                                  lineHeight: "30px",
                                  fontWeight: "600",
                                }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td style={{ fontWeight: "600" }}>{item.dishName}</td>
                            <td>
                              <span
                                style={{
                                  color: item.count > 10 ? "#dc3545" : item.count > 5 ? "#ffc107" : "#28a745",
                                  fontWeight: "600",
                                }}
                              >
                                {item.count} times
                              </span>
                            </td>
                            <td>{item.lastMarkedSoldOut.toLocaleDateString("en-PH")}</td>
                            <td>
                              <div
                                style={{
                                  background: "#e9ecef",
                                  height: "8px",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  width: "100px",
                                }}
                              >
                                <div
                                  style={{
                                    background: item.count > 10 ? "#dc3545" : item.count > 5 ? "#ffc107" : "#28a745",
                                    height: "100%",
                                    width: `${Math.min((item.count / Math.max(...topSoldOutItems.map((i) => i.count))) * 100, 100)}%`,
                                    borderRadius: "4px",
                                  }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {soldOutItems.length > 5 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">All Sold Out Items</h3>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Dish Name</th>
                          <th>Times Sold Out</th>
                          <th>Last Sold Out</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {soldOutItems
                          .sort((a, b) => b.count - a.count)
                          .map((item) => (
                            <tr key={item.dishName}>
                              <td style={{ fontWeight: "600" }}>{item.dishName}</td>
                              <td>{item.count} times</td>
                              <td>{item.lastMarkedSoldOut.toLocaleDateString("en-PH")}</td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "4px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    background: item.count > 10 ? "#f8d7da" : item.count > 5 ? "#fff3cd" : "#d4edda",
                                    color: item.count > 10 ? "#721c24" : item.count > 5 ? "#856404" : "#155724",
                                  }}
                                >
                                  {item.count > 10
                                    ? "High Frequency"
                                    : item.count > 5
                                      ? "Medium Frequency"
                                      : "Low Frequency"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Branch Comparison Tab (Admin Only) */}
          <RoleChecker allowedRoles={["admin"]}>
            {activeTab === "branches" && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Branch Comparison</h3>
                </div>
                <div style={{ padding: 20, color: '#6c757d' }}>Coming soon: backend endpoint to compare branches.</div>
              </div>
            )}
          </RoleChecker>
        </main>

        {/* Transaction Details Modal */}
        {showTransactionModal && selectedTransaction && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowTransactionModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
              >
                <h2 style={{ margin: 0, color: "#2d5a27", fontSize: "1.5rem" }}>Transaction Details</h2>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#6c757d",
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Transaction ID
                  </label>
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedTransaction.id}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Receipt No.
                  </label>
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedTransaction.receiptNo}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Date & Time
                  </label>
                  <div style={{ padding: "8px 12px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                    {selectedTransaction.dateTime.toLocaleDateString("en-PH", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    <br />
                    <span style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                      {selectedTransaction.dateTime.toLocaleTimeString("en-PH")}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Cashier / User
                  </label>
                  <div style={{ padding: "8px 12px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                    {selectedTransaction.cashier}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Customer
                  </label>
                  <div style={{ padding: "8px 12px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                    {selectedTransaction.customer || "Walk-in Customer"}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#495057" }}>
                    Payment Method
                  </label>
                  <div style={{ padding: "8px 12px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background:
                          selectedTransaction.paymentMethod === "Cash"
                            ? "#d4edda"
                            : selectedTransaction.paymentMethod === "Card"
                              ? "#cce5ff"
                              : selectedTransaction.paymentMethod === "GCash"
                                ? "#fff3cd"
                                : selectedTransaction.paymentMethod === "PayMaya"
                                  ? "#e2e3e5"
                                  : "#f8f9fa",
                        color:
                          selectedTransaction.paymentMethod === "Cash"
                            ? "#155724"
                            : selectedTransaction.paymentMethod === "Card"
                              ? "#004085"
                              : selectedTransaction.paymentMethod === "GCash"
                                ? "#856404"
                                : selectedTransaction.paymentMethod === "PayMaya"
                                  ? "#383d41"
                                  : "#495057",
                      }}
                    >
                      {selectedTransaction.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "12px", color: "#495057" }}>
                  Order Items
                </label>
                <div style={{ border: "1px solid #dee2e6", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa" }}>
                        <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Item</th>
                        <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #dee2e6" }}>Qty</th>
                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>
                          Price
                        </th>
                        <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransaction.items.map((item, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              padding: "12px",
                              borderBottom:
                                index === selectedTransaction.items.length - 1 ? "none" : "1px solid #dee2e6",
                            }}
                          >
                            {item.name}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              borderBottom:
                                index === selectedTransaction.items.length - 1 ? "none" : "1px solid #dee2e6",
                            }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "right",
                              borderBottom:
                                index === selectedTransaction.items.length - 1 ? "none" : "1px solid #dee2e6",
                            }}
                          >
                            ₱{item.price.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "right",
                              fontWeight: "600",
                              borderBottom:
                                index === selectedTransaction.items.length - 1 ? "none" : "1px solid #dee2e6",
                            }}
                          >
                            ₱{(item.quantity * item.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                }}
              >
                <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "#495057" }}>Total Amount:</span>
                <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#2d5a27" }}>
                  ₱{selectedTransaction.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
