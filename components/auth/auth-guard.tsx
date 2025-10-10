"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  email: string
  branch: string
  role: string
}

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function AuthGuard({ children, allowedRoles = [], redirectTo }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")

    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Check role-based access
    if (allowedRoles.length > 0 && !allowedRoles.includes(parsedUser.role)) {
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        // Default redirects based on role
        switch (parsedUser.role) {
          case "cashier":
            router.push("/pos")
            break
          case "supervisor":
            router.push("/dishes")
            break
          case "admin":
            router.push("/dashboard")
            break
          default:
            router.push("/")
        }
      }
      return
    }

    setLoading(false)
  }, [router, allowedRoles, redirectTo])

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f8f9fa",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e9ecef",
              borderTop: "4px solid #2d5a27",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <p style={{ color: "#6c757d", margin: 0 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
