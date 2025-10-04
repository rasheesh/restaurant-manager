"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [branch, setBranch] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, branch })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Login failed")
        setLoading(false)
        return
      }

      // Save session (localStorage for now, but can use JWT/NextAuth later)
      localStorage.setItem("user", JSON.stringify(data.user))

      // Redirect
      // Redirect
      if (data.user.role === "cashier") {
        router.push("/pos")
      } else {
        router.push("/dashboard")
      }

    } catch (error) {
      console.error(error)
      alert("Something went wrong")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Food Business POS</h1>
        <p style={{ textAlign: "center", marginBottom: "30px", color: "#6c757d" }}>Filipino Food Business Management</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="branch">
              Select Branch
            </label>
            <select
              id="branch"
              className="form-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              required
            >
              <option value="">Choose a branch...</option>
              <option value="exxa">Branch 1 (EXXA)</option>
              <option value="tera">Branch 2 (TERA)</option>
              <option value="cnx">Branch 3 (CNX)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: "20px" }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div
          style={{ marginTop: "30px", padding: "15px", background: "#f8f9fa", borderRadius: "6px", fontSize: "14px" }}
        >
          <strong>Demo Accounts:</strong>
          <br />
          <strong>Admin:</strong> adminexxa@gmail.com
          <br />
          <strong>Manager:</strong> supervisortera@gmail.com
          <br />
          <strong>Cashier:</strong> cashiercnx1@gmail.com
          <br />
          <em>Password: "password"</em>
        </div>
      </div>
    </div>
  )
}
