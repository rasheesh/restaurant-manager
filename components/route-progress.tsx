"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function RouteProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!pathname) return
    setActive(true)
    const t = setTimeout(() => setActive(false), 450)
    return () => clearTimeout(t)
  }, [pathname])

  if (!active) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 3,
        width: '100%',
        background: 'linear-gradient(90deg, #2d5a27, #6fb26a)',
        zIndex: 9999,
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)'
      }}
    />
  )
}


