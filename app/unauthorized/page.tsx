"use client"

import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2d5a27, #4a7c59)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          textAlign: "center",
          maxWidth: "500px",
          width: "90%",
        }}
      >
        <div
          style={{
            fontSize: "4rem",
            color: "#dc3545",
            marginBottom: "20px",
          }}
        >
          🚫
        </div>

        <h1
          style={{
            color: "#2d5a27",
            marginBottom: "15px",
            fontSize: "1.8rem",
          }}
        >
          Access Denied
        </h1>

        <p
          style={{
            color: "#6c757d",
            marginBottom: "30px",
            lineHeight: "1.5",
          }}
        >
          You don't have permission to access this page. Please contact your administrator if you believe this is an
          error.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={() => router.back()}>
            Go Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const userData = localStorage.getItem("user")
              if (userData) {
                const user = JSON.parse(userData)
                switch (user.role) {
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
              } else {
                router.push("/")
              }
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
