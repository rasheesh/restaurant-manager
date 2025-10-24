"use client";

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import AuthGuard from "../../../components/auth/auth-guard"
import Sidebar from "../../../components/layout/new-sidebar"

export default function SystemSettings() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  
  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "false")
    } catch {
      return false
    }
  })

  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Keep localStorage in sync with sidebar state
  useEffect(() => {
    try { 
      localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed)) 
    } catch {}
  }, [sidebarCollapsed])

  const [settings, setSettings] = useState({
    businessName: "Food Business POS",
    taxRate: "12",
    currency: "PHP",
    receiptFooter: "Thank you for your business!",
    lowStockThreshold: "10",
    autoBackup: true,
    emailNotifications: true,
    printReceipts: true,
    comboMealPrice: "150",
  })

  const handleSave = () => {
    const settingsToSave = {
      ...settings,
      comboMealPrice: Number.parseFloat(settings.comboMealPrice) || 150,
    }
    localStorage.setItem("systemSettings", JSON.stringify(settingsToSave))
    alert("Settings saved successfully!")
  }

  if (!mounted || !user) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f8f9fa"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e9ecef",
            borderTop: "4px solid #2d5a27",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p style={{ color: "#6c757d", margin: 0 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar user={user} currentPage="/admin/settings" />

        <main
          className="main-content"
          style={{
            marginLeft: "2vw",
            marginRight: "2vw",
            width: "calc(100% - 4vw)",
            transition: "margin-left 260ms ease, width 260ms ease",
          }}
        >
          <div className="page-header">
            <h1 className="flex items-center gap-2">
              <Settings size={24} />
              System Settings
            </h1>
            <p>Configure system-wide settings and preferences</p>
          </div>

          <div className="content-section">
            <div className="settings-grid">
              <div className="settings-card">
                <h3>Business Information</h3>

                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  >
                    <option value="PHP">Philippine Peso (PHP)</option>
                    <option value="USD">US Dollar (USD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Receipt Footer Message</label>
                  <textarea
                    value={settings.receiptFooter}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="settings-card">
                <h3>Inventory Settings</h3>

                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
                  />
                  <small>Alert when stock falls below this quantity</small>
                </div>
              </div>

              <div className="settings-card">
                <h3>Pricing Settings</h3>

                <div className="form-group">
                  <label>Combo Meal Fixed Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.comboMealPrice}
                    onChange={(e) => setSettings({ ...settings, comboMealPrice: e.target.value })}
                  />
                  <small>Fixed price for all combo meals (1 rice + selected dishes)</small>
                </div>
              </div>

              <div className="settings-card">
                <h3>System Preferences</h3>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                    />
                    Enable automatic daily backups
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                    Send email notifications for low stock
                  </label>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.printReceipts}
                      onChange={(e) => setSettings({ ...settings, printReceipts: e.target.checked })}
                    />
                    Automatically print receipts
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "30px", textAlign: "center" }}>
              <button className="btn btn-primary btn-lg" onClick={handleSave}>
                Save All Settings
              </button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
