"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "../../components/layout/sidebar"
import AuthGuard from "../../components/auth/auth-guard"

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

export default function CreditPage() {
  const [user, setUser] = useState<User | null>(null)
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const router = useRouter()

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
  }, [router])

  const loadCreditTransactions = async () => {
    try {
      // Load from localStorage first (where POS stores credit transactions)
      const localStorageCredits = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
      
      // Also try to load from API as backup
      let apiCredits: any[] = []
      try {
        const apiResponse = await fetch('/api/credit_transactions')
        if (apiResponse.ok) {
          apiCredits = await apiResponse.json()
        }
      } catch (error) {
        console.log('API credit transactions not available, using localStorage only')
      }

      // Combine both sources, prioritizing localStorage for recent transactions
      const allTransactions = [...localStorageCredits, ...apiCredits]
      
      // Remove duplicates based on order number and customer name
      const uniqueTransactions = allTransactions.filter((transaction, index, self) => 
        index === self.findIndex(t => 
          t.orderNumber === transaction.orderNumber && 
          t.customerName === transaction.customerName &&
          Math.abs(new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime()) < 60000 // within 1 minute
        )
      )

      const processedTransactions = uniqueTransactions.map((transaction: any) => {
        // Calculate total payments for this transaction
        const payments = transaction.payments || []
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
        const remainingBalance = Number(transaction.amount || 0) - totalPaid
        
        // Determine status based on remaining balance
        let status: "unpaid" | "partial" | "paid" = "unpaid"
        if (remainingBalance <= 0) {
          status = "paid"
        } else if (totalPaid > 0) {
          status = "partial"
        }

        return {
          id: transaction.id || Date.now() + Math.random(),
          orderNumber: transaction.orderNumber || transaction.order_id || 0,
          customerName: transaction.customerName || transaction.customer_name || 'Unknown Customer',
          customerContact: transaction.customerContact || transaction.contact || '',
          amount: Number(transaction.amount || 0),
          amountPaid: totalPaid,
          remainingBalance: Math.max(0, remainingBalance),
          timestamp: new Date(transaction.timestamp || transaction.created_at || Date.now()),
          status,
          cashier: transaction.cashier || '',
          payments: payments.map((payment: any) => ({
            id: payment.id || Date.now() + Math.random(),
            amount: Number(payment.amount || 0),
            timestamp: new Date(payment.timestamp || payment.created_at || Date.now()),
            cashier: payment.cashier || '',
            method: payment.method || 'cash',
          })),
        }
      })

      // Sort by timestamp (newest first)
      processedTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setCreditTransactions(processedTransactions)
    } catch (error) {
      console.error('Failed to load credit transactions:', error)
      // Fallback to empty array if everything fails
      setCreditTransactions([])
    }
  }

  const openPaymentModal = (transaction: CreditTransaction) => {
    setSelectedTransaction(transaction)
    setPaymentAmount(0)
    setPaymentMethod("cash")
    setShowPaymentModal(true)
  }

  const openHistoryModal = (transaction: CreditTransaction) => {
    setSelectedTransaction(transaction)
    setShowHistoryModal(true)
  }

  const processPayment = async () => {
    if (!selectedTransaction || paymentAmount <= 0) return

    try {
      // Create payment record
      const payment: Payment = {
        id: Date.now(),
        amount: paymentAmount,
        timestamp: new Date(),
        cashier: user?.email || "Unknown",
        method: paymentMethod,
      }

      // Update the transaction with the new payment
      const updatedTransaction = {
        ...selectedTransaction,
        payments: [...selectedTransaction.payments, payment],
        amountPaid: selectedTransaction.amountPaid + paymentAmount,
        remainingBalance: Math.max(0, selectedTransaction.remainingBalance - paymentAmount),
        status: selectedTransaction.remainingBalance - paymentAmount <= 0 ? "paid" : "partial" as "paid" | "partial",
      }

      // Update localStorage
      const existingCredits = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
      const updatedCredits = existingCredits.map((transaction: any) => 
        transaction.id === selectedTransaction.id ? updatedTransaction : transaction
      )
      localStorage.setItem("creditTransactions", JSON.stringify(updatedCredits))

      // Also try to save to API if available
      try {
        const paymentPayload = {
          credit_transaction_id: selectedTransaction.id,
          amount: paymentAmount,
          method: paymentMethod,
          cashier: user?.email || "Unknown",
          description: `Payment via ${paymentMethod}`,
        }

        await fetch('/api/credit_transactions/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentPayload),
        })
      } catch (apiError) {
        console.log('API payment recording failed, but localStorage updated successfully')
      }

      // Update local state
      const updatedTransactions = creditTransactions.map((transaction) =>
        transaction.id === selectedTransaction.id ? updatedTransaction : transaction,
      )
      setCreditTransactions(updatedTransactions)

      // Show success message
      alert(`Payment of ₱${paymentAmount.toFixed(2)} recorded successfully!`)
      
      setShowPaymentModal(false)
      setSelectedTransaction(null)
      setPaymentAmount(0)
    } catch (error) {
      console.error('Failed to process payment:', error)
      alert('Failed to record payment. Please try again.')
    }
  }

  const getTotalCreditBalance = () => {
    return creditTransactions
      .filter((transaction) => transaction.status !== "paid")
      .reduce((sum, transaction) => sum + transaction.remainingBalance, 0)
  }

  const getFilteredTransactions = () => {
    let filtered = creditTransactions

    if (searchTerm) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.customerContact.includes(searchTerm) ||
          transaction.orderNumber.toString().includes(searchTerm),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((transaction) => transaction.status === statusFilter)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const filteredTransactions = getFilteredTransactions()
  const totalCreditBalance = getTotalCreditBalance()
  const unpaidCount = creditTransactions.filter((t) => t.status === "unpaid").length
  const partialCount = creditTransactions.filter((t) => t.status === "partial").length

  return (
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/credit" />

        <main className="main-content">
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Credit Management</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "14px" }}
                onClick={loadCreditTransactions}
              >
                🔄 Refresh
              </button>
              <span style={{ color: "#6c757d" }}>Total Outstanding: ₱{totalCreditBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-4 mb-20">
            <div className="summary-card">
              <div className="summary-value" style={{ color: "#dc3545" }}>
                ₱{totalCreditBalance.toFixed(2)}
              </div>
              <div className="summary-label">Total Outstanding</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{ color: "#ffc107" }}>
                {unpaidCount}
              </div>
              <div className="summary-label">Unpaid Transactions</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{ color: "#fd7e14" }}>
                {partialCount}
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
              <h3 className="card-title">Credit Transactions</h3>
              <div style={{ display: "flex", gap: "15px", marginTop: "15px", flexWrap: "wrap" }}>
                <div style={{ flex: "1", minWidth: "200px" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by name, contact, or order number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ minWidth: "150px" }}>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="all">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
                <p>No credit transactions found.</p>
                {searchTerm || statusFilter !== "all" ? (
                  <p style={{ fontSize: "0.9rem" }}>Try adjusting your search or filter criteria.</p>
                ) : (
                  <p style={{ fontSize: "0.9rem" }}>
                    Credit transactions will appear here when customers use "Utang Muna" payment option.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td style={{ fontWeight: "600" }}>#{transaction.orderNumber}</td>
                        <td>{transaction.customerName}</td>
                        <td>{transaction.customerContact}</td>
                        <td>{transaction.timestamp.toLocaleDateString("en-PH")}</td>
                        <td>₱{transaction.amount.toFixed(2)}</td>
                        <td style={{ color: "#28a745" }}>₱{transaction.amountPaid.toFixed(2)}</td>
                        <td
                          style={{ color: transaction.remainingBalance > 0 ? "#dc3545" : "#28a745", fontWeight: "600" }}
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
                            {transaction.status === "partial" && "⚠️ Partial"}
                            {transaction.status === "unpaid" && "❌ Unpaid"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {transaction.status !== "paid" && (
                              <button
                                className="btn btn-success"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                onClick={() => openPaymentModal(transaction)}
                              >
                                Add Payment
                              </button>
                            )}
                            {transaction.payments.length > 0 && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                onClick={() => openHistoryModal(transaction)}
                              >
                                History
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showPaymentModal && selectedTransaction && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
              onClick={() => setShowPaymentModal(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "500px",
                  width: "90%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Record Payment</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowPaymentModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#2d5a27" }}>Customer Information</h4>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Name:</strong> {selectedTransaction.customerName}
                  </p>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Contact:</strong> {selectedTransaction.customerContact}
                  </p>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Order #:</strong> {selectedTransaction.orderNumber}
                  </p>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Total Amount:</strong> ₱{selectedTransaction.amount.toFixed(2)}
                  </p>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Amount Paid:</strong> ₱{selectedTransaction.amountPaid.toFixed(2)}
                  </p>
                  <p style={{ margin: 0, fontWeight: "600", color: "#dc3545" }}>
                    <strong>Remaining Balance:</strong> ₱{selectedTransaction.remainingBalance.toFixed(2)}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedTransaction.remainingBalance}
                    className="form-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number.parseFloat(e.target.value) || 0)}
                    placeholder="Enter payment amount"
                  />
                  <small style={{ color: "#6c757d", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    Maximum: ₱{selectedTransaction.remainingBalance.toFixed(2)}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                {paymentAmount > 0 && (
                  <div style={{ background: "#d1ecf1", padding: "15px", borderRadius: "6px", marginTop: "15px" }}>
                    <p style={{ margin: "0 0 5px 0", color: "#0c5460" }}>
                      <strong>Payment Summary:</strong>
                    </p>
                    <p style={{ margin: "0 0 5px 0", color: "#0c5460" }}>Payment Amount: ₱{paymentAmount.toFixed(2)}</p>
                    <p style={{ margin: "0 0 5px 0", color: "#0c5460" }}>
                      New Balance: ₱{Math.max(0, selectedTransaction.remainingBalance - paymentAmount).toFixed(2)}
                    </p>
                    <p style={{ margin: 0, color: "#0c5460", fontWeight: "600" }}>
                      Status after payment:{" "}
                      {paymentAmount >= selectedTransaction.remainingBalance ? "FULLY PAID" : "PARTIAL PAYMENT"}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={processPayment}
                    disabled={paymentAmount <= 0 || paymentAmount > selectedTransaction.remainingBalance}
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment History Modal */}
          {showHistoryModal && selectedTransaction && (
            <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90vw" }}>
                <div className="modal-header">
                  <h3>Payment History - {selectedTransaction.customerName}</h3>
                  <button className="modal-close" onClick={() => setShowHistoryModal(false)}>
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div style={{ marginBottom: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "6px" }}>
                    <p style={{ margin: "0 0 5px 0", fontWeight: "600" }}>
                      <strong>Order #:</strong> {selectedTransaction.orderNumber}
                    </p>
                    <p style={{ margin: "0 0 5px 0" }}>
                      <strong>Total Amount:</strong> ₱{selectedTransaction.amount.toFixed(2)}
                    </p>
                    <p style={{ margin: "0 0 5px 0", fontWeight: "600", color: "#28a745" }}>
                      <strong>Amount Paid:</strong> ₱{selectedTransaction.amountPaid.toFixed(2)}
                    </p>
                    <p style={{ margin: 0, fontWeight: "600", color: "#dc3545" }}>
                      <strong>Remaining Balance:</strong> ₱{selectedTransaction.remainingBalance.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: "0 0 15px 0", color: "#2d5a27" }}>Payment History</h4>
                    {selectedTransaction.payments.length > 0 ? (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Amount</th>
                              <th>Date</th>
                              <th>Method</th>
                              <th>Cashier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTransaction.payments.map((payment, index) => (
                              <tr key={payment.id}>
                                <td>{index + 1}</td>
                                <td style={{ fontWeight: "600", color: "#28a745" }}>
                                  ₱{payment.amount.toFixed(2)}
                                </td>
                                <td>{payment.timestamp.toLocaleDateString("en-PH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}</td>
                                <td>
                                  <span className="status-badge success">
                                    {payment.method.toUpperCase()}
                                  </span>
                                </td>
                                <td>{payment.cashier}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ textAlign: "center", color: "#6c757d", fontStyle: "italic" }}>
                        No payments recorded yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                    Close
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
