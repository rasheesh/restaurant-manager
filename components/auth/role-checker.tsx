"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface User {
  email: string
  branch: string
  role: string
}

interface RoleCheckerProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleChecker({ allowedRoles, children, fallback }: RoleCheckerProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null
  }

  return <>{children}</>
}
