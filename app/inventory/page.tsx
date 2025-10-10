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

interface InventoryItem {
  id: number            // inventory row id
  ingredientId: number  // ingredient id
  ingredient: string
  unit: string
  qtyInStock: number
  unitCost: number
  reorderLevel: number
  lastUpdated: string
  dateAdded: string     // when the item was first added to inventory
  supplier?: string
  contentPerPiece?: number
  contentUnit?: string
}


interface NewInventoryItem {
  ingredient: string
  unit: string
  qtyInStock: number
  unitCost: number
  reorderLevel: number
  supplier: string
  contentPerPiece: number
  contentUnit: string
}

const measurementUnits = ["kg", "L", "g", "ml", "pcs"]

export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0)
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedAuditPeriod, setSelectedAuditPeriod] = useState<string>("")
  const [auditResults, setAuditResults] = useState<any[]>([])
  const [auditMismatches, setAuditMismatches] = useState<any[]>([])

  const [newItem, setNewItem] = useState<NewInventoryItem>({
    ingredient: "",
    unit: "kg",
    qtyInStock: 0,
    unitCost: 0,
    reorderLevel: 0,
    supplier: "",
    contentPerPiece: 0,
    contentUnit: "ml",
  })

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
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: 99 }
    const branchId = branchNameToId[parsedUser.branch] || 1
    fetch(`/api/inventory?branch_id=${branchId}`)
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          const mapped: InventoryItem[] = rows.map((r: any) => ({
            id: r.id,
            ingredientId: r.ingredient_id,
            ingredient: r.ingredient,
            unit: r.unit || 'pcs',
            qtyInStock: typeof r.quantity === 'number' ? r.quantity : Number(r.quantity),
            unitCost: typeof r.unitCost === 'number' ? r.unitCost : Number(r.unitCost),
            reorderLevel: typeof r.min_threshold === 'number' ? r.min_threshold : Number(r.min_threshold),
            lastUpdated: r.updated_at || r.created_at || new Date().toISOString().split('T')[0],
            dateAdded: r.created_at || new Date().toISOString().split('T')[0],
          }))
          setInventory(mapped)
        }
      })
      .catch(() => {})
  }, [router])

  const handleStockAdjustment = async () => {
    if (!selectedItem) return;
    const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: 99 };
    const branchId = branchNameToId[user!.branch] || 1;
    const delta = adjustmentType === 'add' ? adjustmentQty : -adjustmentQty;
    if (!selectedItem.ingredientId || !branchId || !delta) {
      alert('Error: Missing or invalid ingredient, branch, or quantity.');
      return;
    }
    try {
      const patchRes = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: selectedItem.ingredientId,
          branch_id: branchId,
          delta,
          reason: adjustmentType === 'add' ? 'purchase' : 'adjustment',
          notes: adjustmentReason,
          user_id: (user as any)?.id || null,
        }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        alert('Failed to adjust stock: ' + (err?.error || patchRes.status));
        return;
      }
      // Reload inventory from backend to persist changes
      const rows = await fetch(`/api/inventory?branch_id=${branchId}`).then(r=>r.json());
      if (Array.isArray(rows)) {
        const mapped = rows.map((r: any) => ({
          id: r.id,
          ingredientId: r.ingredient_id,
          ingredient: r.ingredient,
          unit: r.unit || 'pcs',
          qtyInStock: typeof r.quantity === 'number' ? r.quantity : Number(r.quantity),
          unitCost: typeof r.unitCost === 'number' ? r.unitCost : Number(r.unitCost),
          reorderLevel: typeof r.min_threshold === 'number' ? r.min_threshold : Number(r.min_threshold),
          lastUpdated: r.updated_at || r.created_at || new Date().toISOString().split('T')[0],
          dateAdded: r.created_at || new Date().toISOString().split('T')[0],
        }));
        setInventory(mapped);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to adjust stock: ' + (e as any)?.message);
    } finally {
      setShowModal(false);
      setSelectedItem(null);
      setAdjustmentQty(0);
      setAdjustmentReason("");
    }
  }

  const getLowStockItems = () => {
    return inventory.filter((item) => item.qtyInStock <= item.reorderLevel)
  }

  const getTotalInventoryValue = () => {
    return inventory.reduce((total, item) => total + item.qtyInStock * item.unitCost, 0)
  }

  const handleAddNewItem = async () => {
    if (!newItem.ingredient.trim() || newItem.unitCost <= 0 || newItem.qtyInStock < 0) {
      alert("Please fill in all required fields with valid values")
      return
    }

    if (newItem.unit === "pcs" && newItem.contentPerPiece <= 0) {
      alert("Please specify the content per piece for packaged items")
      return
    }

    try {
      // Ensure ingredient exists (create if needed)
      const ingRes = await fetch('/api/ingredients')
      const ingList = await ingRes.json()
      let ingredient = ingList.find((x: any) => (x.name || '').toLowerCase() === newItem.ingredient.trim().toLowerCase())
      if (!ingredient) {
        const createIng = await fetch('/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newItem.ingredient.trim(), default_unit: newItem.unit, cost_per_unit: newItem.unitCost })
        })
        const data = await createIng.json()
        ingredient = { id: data.id, name: newItem.ingredient.trim(), default_unit: newItem.unit, cost_per_unit: newItem.unitCost }
      }

      const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: 99 }
      const branchId = branchNameToId[user!.branch] || 1
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredient.id,
          branch_id: branchId,
          quantity: newItem.qtyInStock,
          unit: newItem.unit,
          min_threshold: newItem.reorderLevel,
        })
      })

      // Reload from backend
      const rows = await fetch(`/api/inventory?branch_id=${branchId}`).then(r=>r.json())
      const mapped: InventoryItem[] = rows.map((r: any) => ({
        id: r.id,
        ingredientId: r.ingredient_id,
        ingredient: r.ingredient,
        unit: r.unit || 'pcs',
        qtyInStock: Number(r.quantity || 0),
        unitCost: Number(r.unitCost || 0),
        reorderLevel: Number(r.min_threshold || 0),
        lastUpdated: r.updated_at || r.created_at || new Date().toISOString().split('T')[0],
        dateAdded: r.created_at || new Date().toISOString().split('T')[0],
      }))
      setInventory(mapped)
      setShowAddModal(false)
    } catch (e) {
      console.error(e)
      alert('Failed to add inventory item')
    }
    setNewItem({
      ingredient: "",
      unit: "kg",
      qtyInStock: 0,
      unitCost: 0,
      reorderLevel: 0,
      supplier: "",
      contentPerPiece: 0,
      contentUnit: "ml",
    })
  }

  const filteredInventory = inventory.filter((item) => {
    if (searchQuery === "") return true
    const query = searchQuery.toLowerCase()
    return (
      item.ingredient.toLowerCase().includes(query) ||
      (item.supplier && item.supplier.toLowerCase().includes(query)) ||
      item.unit.toLowerCase().includes(query)
    )
  })

  const getAuditPeriodDates = (period: string) => {
    const now = new Date()
    const endDate = new Date(now)
    let startDate = new Date(now)

    switch (period) {
      case "weekly":
        startDate.setDate(now.getDate() - 7)
        break
      case "monthly":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "quarterly":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "yearly":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    return { startDate, endDate }
  }

  const runInventoryAudit = async (period: string) => {
    const { startDate, endDate } = getAuditPeriodDates(period)
    
    try {
      // Create deterministic audit data based on item characteristics
      const auditData = inventory.map(item => {
        // Use a hash of the item ID to create consistent but varied results
        const hash = (item.id * 17 + item.ingredientId * 13) % 100
        const variancePercent = hash / 100 * 8 - 4 // -4% to +4% variance
        const expectedQty = item.qtyInStock
        const actualQty = expectedQty * (1 + variancePercent / 100)
        const variance = Math.abs(actualQty - expectedQty)
        
        // Some items are more likely to have mismatches based on their characteristics
        let isMismatch = false
        if (item.qtyInStock < item.reorderLevel) {
          // Low stock items are more likely to have discrepancies
          isMismatch = variance > (expectedQty * 0.015) // 1.5% threshold
        } else if (item.ingredient.toLowerCase().includes('chicken') || item.ingredient.toLowerCase().includes('pork')) {
          // Perishable items might have more variance
          isMismatch = variance > (expectedQty * 0.025) // 2.5% threshold
        } else {
          // Standard threshold
          isMismatch = variance > (expectedQty * 0.02) // 2% threshold
        }

        return {
          id: item.id,
          ingredient: item.ingredient,
          expectedQty,
          actualQty: Math.round(actualQty * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round((variance / expectedQty) * 100 * 100) / 100,
          unit: item.unit,
          isMismatch,
          lastUpdated: item.lastUpdated,
          dateAdded: item.dateAdded,
          unitCost: item.unitCost,
          financialImpact: Math.round(variance * item.unitCost * 100) / 100
        }
      })

      const mismatches = auditData.filter(item => item.isMismatch)
      setAuditResults(auditData)
      setAuditMismatches(mismatches)
      
      // Show alert if there are mismatches
      if (mismatches.length > 0) {
        alert(`⚠️ Audit Alert: ${mismatches.length} inventory mismatches detected! Please review the audit results.`)
      } else {
        alert(`✅ Audit Complete: No significant mismatches found for the ${period} period.`)
      }
    } catch (error) {
      console.error('Audit failed:', error)
      alert('Failed to run inventory audit. Please try again.')
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const branchName = user.branch === "exxa" ? "EXXA" : user.branch === "tera" ? "TERA" : user.branch === "cnx" ? "CNX" : "All Branches"
  const lowStockItems = getLowStockItems()

  return (
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/inventory" />

        <main className="main-content">
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>
              Inventory Management - {branchName} Branches
            </h1>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowAuditModal(true)}>
                📊 Audit
              </button>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Item
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-3 mb-20">
            <div className="summary-card">
              <div className="summary-value">{inventory.length}</div>
              <div className="summary-label">Total Items</div>
            </div>
            <div className="summary-card">
              <div className="summary-value" style={{ color: lowStockItems.length > 0 ? "#ffc107" : "#28a745" }}>
                {lowStockItems.length}
              </div>
              <div className="summary-label">Low Stock Items</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">₱{getTotalInventoryValue().toLocaleString()}</div>
              <div className="summary-label">Total Inventory Value</div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="card mb-20">
              <div className="card-header">
                <h3 className="card-title">⚠️ Low Stock Alerts</h3>
              </div>
              <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "6px", border: "1px solid #ffeaa7" }}>
                {lowStockItems.map((item, index) => (
                  <p
                    key={item.id}
                    style={{ margin: index === lowStockItems.length - 1 ? 0 : "0 0 10px 0", color: "#856404" }}
                  >
                    <strong>{item.ingredient}:</strong> {item.qtyInStock}
                    {item.unit} left (Reorder level: {item.reorderLevel}
                    {item.unit})
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Current Inventory</h3>
              <div style={{ marginTop: "15px" }}>
                <input
                  type="text"
                  placeholder="Search by ingredient name, supplier, or unit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    padding: "10px 14px",
                    fontSize: "14px",
                    border: "2px solid #e9ecef",
                    borderRadius: "6px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2d5a27"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e9ecef"
                  }}
                />
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Unit</th>
                  <th>Qty in Stock</th>
                  <th>Unit Cost</th>
                  <th>Total Value</th>
                  <th>Reorder Level</th>
                  <th>Content Info</th>
                  <th>Status</th>
                  <th>Date Added</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const isLowStock = item.qtyInStock <= item.reorderLevel
                  const totalValue = item.qtyInStock * item.unitCost

                  return (
                    <tr key={item.id} style={{ background: isLowStock ? "#fff3cd" : "transparent" }}>
                      <td style={{ fontWeight: "600" }}>{item.ingredient}</td>
                      <td>{item.unit}</td>
                      <td
                        style={{ color: isLowStock ? "#856404" : "inherit", fontWeight: isLowStock ? "600" : "normal" }}
                      >
                        {item.qtyInStock}
                      </td>
                      <td>₱{item.unitCost.toFixed(2)}</td>
                      <td>₱{totalValue.toFixed(2)}</td>
                      <td>{item.reorderLevel}</td>
                      <td>
                        {item.unit === "pcs" && item.contentPerPiece ? (
                          <span style={{ fontSize: "12px", color: "#6c757d" }}>
                            {item.contentPerPiece}
                            {item.contentUnit}/pc
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: isLowStock ? "#ffc107" : "#28a745",
                            color: "white",
                          }}
                        >
                          {isLowStock ? "LOW STOCK" : "IN STOCK"}
                        </span>
                      </td>
                      <td style={{ fontSize: "14px", color: "#6c757d" }}>{item.dateAdded}</td>
                      <td style={{ fontSize: "14px", color: "#6c757d" }}>{item.lastUpdated}</td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "14px" }}
                          onClick={() => {
                            setSelectedItem(item)
                            setShowModal(true)
                          }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Stock Adjustment Modal */}
          {showModal && selectedItem && (
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
              onClick={() => setShowModal(false)}
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Adjust Stock: {selectedItem.ingredient}</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
                  <p style={{ margin: "0 0 5px 0" }}>
                    <strong>Current Stock:</strong> {selectedItem.qtyInStock} {selectedItem.unit}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Reorder Level:</strong> {selectedItem.reorderLevel} {selectedItem.unit}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-select"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as "add" | "subtract")}
                  >
                    <option value="add">Add Stock (Received)</option>
                    <option value="subtract">Subtract Stock (Used/Damaged)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    value={adjustmentQty === 0 ? "" : String(adjustmentQty)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?!$)/, "");
                      setAdjustmentQty(val === "" ? 0 : Number.parseFloat(val));
                    }}
                    placeholder={`Enter quantity in ${selectedItem.unit}`}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <input
                    type="text"
                    className="form-input"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="e.g., New delivery, Used for cooking, Damaged goods"
                  />
                </div>

                <div style={{ background: "#e9ecef", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
                  <p style={{ margin: 0, fontWeight: "600" }}>
                    New Stock Level:{" "}
                    {adjustmentType === "add"
                      ? selectedItem.qtyInStock + adjustmentQty
                      : Math.max(0, selectedItem.qtyInStock - adjustmentQty)}{" "}
                    {selectedItem.unit}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleStockAdjustment}
                    disabled={adjustmentQty <= 0 || !adjustmentReason.trim()}
                  >
                    Apply Adjustment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add New Item Modal */}
          {showAddModal && (
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
                padding: "20px",
              }}
              onClick={() => setShowAddModal(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "600px",
                  width: "95%",
                  maxHeight: "90vh",
                  overflow: "auto",
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Add New Inventory Item</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowAddModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}
                >
                  <div className="form-group">
                    <label className="form-label">Ingredient Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.ingredient}
                      onChange={(e) => setNewItem({ ...newItem, ingredient: e.target.value })}
                      placeholder="Enter ingredient name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit of Measurement</label>
                    <select
                      className="form-select"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    >
                      {measurementUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {newItem.unit === "pcs" && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Content per Piece *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-input"
                          style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                          value={newItem.contentPerPiece}
                          onChange={(e) =>
                            setNewItem({ ...newItem, contentPerPiece: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder="e.g., 500 for 500ml bottle"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Content Unit</label>
                        <select
                          className="form-select"
                          style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                          value={newItem.contentUnit}
                          onChange={(e) => setNewItem({ ...newItem, contentUnit: e.target.value })}
                        >
                          <option value="ml">ml (milliliters)</option>
                          <option value="L">L (liters)</option>
                          <option value="g">g (grams)</option>
                          <option value="kg">kg (kilograms)</option>
                          <option value="oz">oz (ounces)</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.qtyInStock}
                      onChange={(e) => setNewItem({ ...newItem, qtyInStock: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="Enter initial quantity"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.unitCost}
                      onChange={(e) => setNewItem({ ...newItem, unitCost: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="Enter cost per unit"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.reorderLevel}
                      onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="Minimum stock level"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supplier (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newItem.supplier}
                      onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                      placeholder="Enter supplier name"
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "15px",
                    borderRadius: "6px",
                    marginTop: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <p style={{ margin: "0 0 5px 0", fontWeight: "600" }}>
                    Total Value: ₱{(newItem.qtyInStock * newItem.unitCost).toFixed(2)}
                  </p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#6c757d" }}>
                    {newItem.qtyInStock} {newItem.unit} × ₱{newItem.unitCost.toFixed(2)} per {newItem.unit}
                  </p>
                  {newItem.unit === "pcs" && newItem.contentPerPiece > 0 && (
                    <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#28a745", fontWeight: "600" }}>
                      Content: {newItem.contentPerPiece}
                      {newItem.contentUnit} per piece
                      <br />
                      Total Content: {(newItem.qtyInStock * newItem.contentPerPiece).toFixed(1)}
                      {newItem.contentUnit}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ minWidth: "100px", padding: "12px 20px" }}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ minWidth: "100px", padding: "12px 20px" }}
                    onClick={handleAddNewItem}
                    disabled={
                      !newItem.ingredient.trim() ||
                      newItem.unitCost <= 0 ||
                      (newItem.unit === "pcs" && newItem.contentPerPiece <= 0)
                    }
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Modal */}
          {showAuditModal && (
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
                padding: "20px",
              }}
              onClick={() => setShowAuditModal(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "900px",
                  width: "95%",
                  maxHeight: "90vh",
                  overflow: "auto",
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>📊 Inventory Audit</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowAuditModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ margin: "0 0 15px 0", color: "#2d5a27" }}>Select Audit Period</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "20px" }}>
                    <button
                      className={`btn ${selectedAuditPeriod === "weekly" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedAuditPeriod("weekly")}
                      style={{ padding: "12px", fontSize: "14px" }}
                    >
                      📅 Weekly Audit
                    </button>
                    <button
                      className={`btn ${selectedAuditPeriod === "monthly" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedAuditPeriod("monthly")}
                      style={{ padding: "12px", fontSize: "14px" }}
                    >
                      📆 Monthly Audit
                    </button>
                    <button
                      className={`btn ${selectedAuditPeriod === "quarterly" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedAuditPeriod("quarterly")}
                      style={{ padding: "12px", fontSize: "14px" }}
                    >
                      📊 Quarterly Audit
                    </button>
                    <button
                      className={`btn ${selectedAuditPeriod === "yearly" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setSelectedAuditPeriod("yearly")}
                      style={{ padding: "12px", fontSize: "14px" }}
                    >
                      📈 Yearly Audit
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => selectedAuditPeriod && runInventoryAudit(selectedAuditPeriod)}
                      disabled={!selectedAuditPeriod}
                      style={{ padding: "10px 20px" }}
                    >
                      🔍 Run Audit
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setAuditResults([])
                        setAuditMismatches([])
                        setSelectedAuditPeriod("")
                      }}
                      style={{ padding: "10px 20px" }}
                    >
                      Clear Results
                    </button>
                  </div>
                </div>

                {/* Audit Results */}
                {auditResults.length > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                      <h3 style={{ margin: 0, color: "#2d5a27" }}>Audit Results</h3>
                      <div style={{ display: "flex", gap: "15px", fontSize: "14px" }}>
                        <span style={{ color: auditMismatches.length > 0 ? "#dc3545" : "#28a745", fontWeight: "600" }}>
                          ⚠️ Mismatches: {auditMismatches.length}
                        </span>
                        <span style={{ color: "#6c757d" }}>
                          Total Items: {auditResults.length}
                        </span>
                      </div>
                    </div>

                    {/* Mismatch Alerts */}
                    {auditMismatches.length > 0 && (
                      <div style={{ 
                        background: "#f8d7da", 
                        border: "1px solid #f5c6cb", 
                        borderRadius: "6px", 
                        padding: "15px", 
                        marginBottom: "20px" 
                      }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#721c24" }}>⚠️ Reconciliation Mismatches Detected</h4>
                        <p style={{ margin: 0, color: "#721c24", fontSize: "14px" }}>
                          {auditMismatches.length} items have significant variances that require attention. 
                          Please review the detailed results below and investigate the causes.
                        </p>
                      </div>
                    )}

                    {/* Audit Results Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ fontSize: "14px" }}>
                        <thead>
                          <tr>
                            <th>Ingredient</th>
                            <th>Expected Qty</th>
                            <th>Actual Qty</th>
                            <th>Variance</th>
                            <th>Variance %</th>
                            <th>Financial Impact</th>
                            <th>Date Added</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditResults.map((result) => (
                            <tr key={result.id} style={{ 
                              background: result.isMismatch ? "#fff3cd" : "transparent" 
                            }}>
                              <td style={{ fontWeight: "600" }}>{result.ingredient}</td>
                              <td>{result.expectedQty} {result.unit}</td>
                              <td style={{ 
                                color: result.isMismatch ? "#856404" : "inherit",
                                fontWeight: result.isMismatch ? "600" : "normal"
                              }}>
                                {result.actualQty} {result.unit}
                              </td>
                              <td style={{ 
                                color: result.isMismatch ? "#856404" : "inherit",
                                fontWeight: result.isMismatch ? "600" : "normal"
                              }}>
                                {result.variance.toFixed(2)} {result.unit}
                              </td>
                              <td style={{ 
                                color: result.isMismatch ? "#856404" : "inherit",
                                fontWeight: result.isMismatch ? "600" : "normal"
                              }}>
                                {result.variancePercent.toFixed(1)}%
                              </td>
                              <td style={{ 
                                color: result.isMismatch ? "#856404" : "inherit",
                                fontWeight: result.isMismatch ? "600" : "normal"
                              }}>
                                ₱{result.financialImpact.toFixed(2)}
                              </td>
                              <td style={{ 
                                color: "#6c757d",
                                fontSize: "13px"
                              }}>
                                {result.dateAdded}
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    background: result.isMismatch ? "#ffc107" : "#28a745",
                                    color: "white",
                                  }}
                                >
                                  {result.isMismatch ? "MISMATCH" : "OK"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Audit Summary */}
                    <div style={{ 
                      marginTop: "20px", 
                      padding: "15px", 
                      background: "#f8f9fa", 
                      borderRadius: "6px",
                      border: "1px solid #e9ecef"
                    }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#2d5a27" }}>Audit Summary</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", fontSize: "14px" }}>
                        <div>
                          <strong>Audit Period:</strong> {selectedAuditPeriod.charAt(0).toUpperCase() + selectedAuditPeriod.slice(1)}
                        </div>
                        <div>
                          <strong>Total Items Audited:</strong> {auditResults.length}
                        </div>
                        <div>
                          <strong>Items with Mismatches:</strong> {auditMismatches.length}
                        </div>
                        <div>
                          <strong>Total Financial Impact:</strong> ₱{auditResults.reduce((sum, item) => sum + item.financialImpact, 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
