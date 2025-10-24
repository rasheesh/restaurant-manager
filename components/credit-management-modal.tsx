"use client"

import { useState, useEffect } from "react"

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

interface CreditManagementModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function CreditManagementModal({ isOpen, onClose, user }: CreditManagementModalProps) {
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [searchTerm, setSearchTerm] = useState<string>("")

  useEffect(() => {
    if (isOpen) {
      loadCreditTransactions()
    }
  }, [isOpen])

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

  const processPayment = () => {
    if (!selectedTransaction || paymentAmount <= 0) return

    const payment: Payment = {
      id: Date.now(),
      amount: paymentAmount,
      timestamp: new Date(),
      cashier: user?.email || "Unknown",
      method: paymentMethod,
    }

    const updatedTransaction = {
      ...selectedTransaction,
      payments: [...selectedTransaction.payments, payment],
    }

    // Update localStorage
    const storedTransactions = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
    const updatedStoredTransactions = storedTransactions.map((transaction: any) =>
      transaction.id === selectedTransaction.id
        ? { ...transaction, payments: updatedTransaction.payments }
        : transaction,
    )
    localStorage.setItem("creditTransactions", JSON.stringify(updatedStoredTransactions))

    setSelectedTransaction(null)
    setPaymentAmount(0)
    loadCreditTransactions()
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

    return filtered
      .filter((transaction) => transaction.status !== "paid")
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  if (!isOpen) return null

  const filteredTransactions = getFilteredTransactions()
  const totalCreditBalance = getTotalCreditBalance()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "900px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Credit Management</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Cards */}
          <div className="grid grid-3" style={{ marginBottom: "20px" }}>
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
              <div className="summary-label">Unpaid</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{ color: "#fd7e14" }}>
                {creditTransactions.filter((t) => t.status === "partial").length}
              </div>
              <div className="summary-label">Partial</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, contact, or order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
              <p>No outstanding credit transactions found.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
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
                      <td style={{ fontWeight: "600" }}>{transaction.customerName}</td>
                      <td>{transaction.customerContact}</td>
                      <td>₱{transaction.amount.toFixed(2)}</td>
                      <td style={{ color: "#28a745" }}>₱{transaction.amountPaid.toFixed(2)}</td>
                      <td style={{ color: "#dc3545", fontWeight: "600" }}>
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
                            background: transaction.status === "partial" ? "#fff3cd" : "#f8d7da",
                            color: transaction.status === "partial" ? "#856404" : "#721c24",
                          }}
                        >
                          {transaction.status === "partial" ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={14} />
                              Partial
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle size={14} />
                              Unpaid
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => setSelectedTransaction(transaction)}>
                          Add Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {selectedTransaction && (
          <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Record Payment</h3>
                <button className="modal-close" onClick={() => setSelectedTransaction(null)}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#2d5a27" }}>Customer Information</h4>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Name:</strong> {selectedTransaction.customerName}
                  </p>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Contact:</strong> {selectedTransaction.customerContact}
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
                      {paymentAmount >= selectedTransaction.remainingBalance ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={14} />
                          FULLY PAID
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={14} />
                          PARTIAL PAYMENT
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedTransaction(null)}>
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
      </div>
    </div>
  )
}
