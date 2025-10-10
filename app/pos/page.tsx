"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "../../hooks/use-toast"
import Sidebar from "../../components/layout/sidebar"
import AuthGuard from "../../components/auth/auth-guard"

interface User {
  email: string
  branch: string
  role: string
}

interface Dish {
  id: number
  name: string
  price: number
  halfPrice?: number
  category: string
  available: boolean
  servingsAvailable: number
  totalServings: number
}

interface CartItem {
  dish: Dish
  quantity: number
  size: "regular" | "half"
  price: number
  isCombo?: boolean
  comboItems?: ComboItem[]
}

interface ComboItem {
  dish: Dish
  size: "regular" | "half"
  price: number
}

interface ComboMeal {
  id: number
  name: string
  price: number
  description: string
  available: boolean
}

interface CreditCustomer {
  name: string
  contact: string
  amountOwed: number
}

const sampleDishes: Dish[] = [
  {
    id: 1,
    name: "Chicken Adobo",
    price: 120,
    halfPrice: 70,
    category: "Main Course",
    available: true,
    servingsAvailable: 20,
    totalServings: 20,
  },
  {
    id: 2,
    name: "Pork Sinigang",
    price: 130,
    halfPrice: 75,
    category: "Main Course",
    available: true,
    servingsAvailable: 15,
    totalServings: 15,
  },
  {
    id: 3,
    name: "Lumpiang Shanghai",
    price: 50,
    category: "Appetizer",
    available: true,
    servingsAvailable: 30,
    totalServings: 30,
  },
  {
    id: 4,
    name: "Halo-Halo",
    price: 95,
    category: "Dessert",
    available: true,
    servingsAvailable: 10,
    totalServings: 10,
  },
  {
    id: 5,
    name: "Kare-Kare",
    price: 180,
    halfPrice: 100,
    category: "Main Course",
    available: true,
    servingsAvailable: 12,
    totalServings: 12,
  },
  {
    id: 6,
    name: "Pancit Canton",
    price: 85,
    halfPrice: 50,
    category: "Main Course",
    available: true,
    servingsAvailable: 18,
    totalServings: 18,
  },
  {
    id: 7,
    name: "Lechon Kawali",
    price: 160,
    halfPrice: 90,
    category: "Main Course",
    available: true,
    servingsAvailable: 8,
    totalServings: 8,
  },
  {
    id: 8,
    name: "Buko Pie",
    price: 75,
    category: "Dessert",
    available: true,
    servingsAvailable: 6,
    totalServings: 6,
  },
  {
    id: 9,
    name: "Fresh Buko Juice",
    price: 45,
    category: "Drinks",
    available: true,
    servingsAvailable: 25,
    totalServings: 25,
  },
  {
    id: 10,
    name: "Iced Tea",
    price: 25,
    category: "Drinks",
    available: true,
    servingsAvailable: 30,
    totalServings: 30,
  },
  {
    id: 11,
    name: "Calamansi Juice",
    price: 35,
    category: "Drinks",
    available: true,
    servingsAvailable: 20,
    totalServings: 20,
  },
  {
    id: 12,
    name: "Sago't Gulaman",
    price: 30,
    category: "Drinks",
    available: true,
    servingsAvailable: 15,
    totalServings: 15,
  },
  {
    id: 13,
    name: "Steamed Rice",
    price: 15,
    category: "Rice",
    available: true,
    servingsAvailable: 50,
    totalServings: 50,
  },
  {
    id: 14,
    name: "Garlic Rice",
    price: 20,
    category: "Rice",
    available: true,
    servingsAvailable: 40,
    totalServings: 40,
  },
]

const defaultCombo = {
  id: 1,
  name: "Default Combo",
  basePrice: 15, // Rice price
  description: "1 Rice + Your choice of dish portions",
}

export default function POSPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [orderNumber, setOrderNumber] = useState<number>(1234)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [showComboModal, setShowComboModal] = useState(false)
  const [comboItems, setComboItems] = useState<ComboItem[]>([])
  const [comboMealPrice, setComboMealPrice] = useState<number>(150)
  const [creditCustomer, setCreditCustomer] = useState<CreditCustomer>({
    name: "",
    contact: "",
    amountOwed: 0,
  })
  const [referenceNumber, setReferenceNumber] = useState<string>("")
  const router = useRouter()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const { toast } = useToast()
  const [loadingItems, setLoadingItems] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))

    const savedSettings = localStorage.getItem("systemSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      if (settings.comboMealPrice) {
        setComboMealPrice(Number.parseFloat(settings.comboMealPrice))
      }
    }
    // Load items from backend
    setLoadingItems(true)
    fetch("/api/items")
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          const mapped: Dish[] = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            price: Number(r.price ?? 0),
            halfPrice: r.half_price != null ? Number(r.half_price) : Number(r.price ?? 0) / 2,
            category: r.category || "Uncategorized",
            available: !!r.available,
            servingsAvailable: Number(r.servings_available ?? 0),
            totalServings: Number(r.total_servings ?? 0),
            imageUrl: r.image_url || undefined,
          }))
          setDishes(mapped)
        }
      })
      .catch(() => {})
      .finally(()=> setLoadingItems(false))
  }, [router])

  const categories = ["All", ...Array.from(new Set(dishes.map((dish) => dish.category)))]

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === "All" || dish.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addToCart = (dish: Dish, size: "regular" | "half" = "regular") => {
    if (dish.servingsAvailable <= 0) {
      toast({ title: 'Sold out', description: `${dish.name} is sold out!`, duration: 3000 })
      return
    }

    let price = dish.price
    if (size === "half") {
      price = dish.halfPrice ?? dish.price / 2
    }
    const needed = size === 'half' ? 0.5 : 1
    if (dish.servingsAvailable < needed) {
      toast({ title: 'Insufficient stock', description: `Not enough servings left for ${dish.name}`, duration: 3000 })
      return
    }

    const existingItem = cart.find((item) => item.dish.id === dish.id && item.size === size && !item.isCombo)

    if (existingItem) {
      setCart(cart.map((item) => (item === existingItem ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { dish, quantity: 1, size, price }])
    }

    updateDishServings(dish.id, size === 'half' ? -0.5 : -1)
  }

  const updateDishServings = (dishId: number, servingChange: number) => {
    setDishes((prevDishes) =>
      prevDishes.map((dish) => {
        if (dish.id === dishId) {
          const newServingsAvailable = Math.max(0, dish.servingsAvailable + servingChange)
          const updatedDish = {
            ...dish,
            servingsAvailable: newServingsAvailable,
            available: newServingsAvailable > 0, // Auto-mark as sold out when servings reach 0
          }

          // Track sold-out event when dish becomes unavailable
          if (newServingsAvailable === 0 && dish.servingsAvailable > 0) {
            trackSoldOutEvent(dish.name)
          }

          return updatedDish
        }
        return dish
      }),
    )
  }

  const openComboModal = () => {
    setComboItems([])
    setShowComboModal(true)
  }

  const addComboItemToDish = (dish: Dish, size: "regular" | "half" = "regular") => {
    if (dish.servingsAvailable <= 0) {
      toast({ title: 'Sold out', description: `${dish.name} cannot be added to combo`, duration: 3000 })
      return
    }

    let price = dish.price
    if (size === "half") {
      price = dish.halfPrice ?? dish.price / 2
    }

    const existingComboItem = comboItems.find((item) => item.dish.id === dish.id && item.size === size)

    if (existingComboItem) {
      // Don't allow duplicates in combo, just ignore
      return
    }

    setComboItems([...comboItems, { dish, size, price }])
  }

  const removeComboItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index))
  }

  const addComboToCart = () => {
    if (comboItems.length === 0) {
      alert("Please add at least one dish to the combo")
      return
    }

    const comboCartItem: CartItem = {
      dish: {
        id: 9999, // Special ID for combo
        name: `Combo Meal (₱${comboMealPrice} Fixed)`,
        price: comboMealPrice,
        category: "Combo",
        available: true,
        servingsAvailable: 1,
        totalServings: 1,
      },
      quantity: 1,
      size: "regular",
      price: comboMealPrice,
      isCombo: true,
      comboItems: [...comboItems],
    }

    setCart([...cart, comboCartItem])

    comboItems.forEach((item) => {
      updateDishServings(item.dish.id, item.size === 'half' ? -0.5 : -1)
    })
    // Reduce rice servings
    const riceItem = dishes.find((dish) => dish.category === "Rice")
    if (riceItem) {
      updateDishServings(riceItem.id, -1)
    }

    setShowComboModal(false)
    setComboItems([])
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index)
    } else {
      setCart(cart.map((item, i) => (i === index ? { ...item, quantity } : item)))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const logActivity = (type: string, description: string, metadata?: any) => {
    const activity = {
      id: `ACT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      description,
      user: user?.email || "Unknown",
      metadata,
    }

    const existingActivities = JSON.parse(localStorage.getItem("activityLog") || "[]")
    existingActivities.push(activity)

    // Keep only the last 100 activities to prevent localStorage from getting too large
    if (existingActivities.length > 100) {
      existingActivities.splice(0, existingActivities.length - 100)
    }

    localStorage.setItem("activityLog", JSON.stringify(existingActivities))
  }

  const handlePayment = async () => {
    if (processingCheckout) return
    setProcessingCheckout(true)
    const total = getCartTotal()
    const change = paymentMethod === "cash" ? amountReceived - total : 0
    const transactionTime = new Date()

    const transaction = {
      orderNumber,
      items: [...cart],
      total,
      paymentMethod,
      amountReceived: paymentMethod === "cash" ? amountReceived : total,
      change: paymentMethod === "cash" ? change : 0,
      timestamp: transactionTime,
      cashier: user?.email || "Unknown",
      creditCustomer: paymentMethod === "credit" ? { ...creditCustomer } : null,
      referenceNumber:
        paymentMethod === "gcash" || paymentMethod === "paymaya" || paymentMethod === "card"
          ? referenceNumber
          : undefined,
    }

    setLastTransaction(transaction)

    const salesTransaction = {
      id: `TXN-${Date.now()}`,
      receiptNo: `RCP-${new Date().getFullYear()}-${orderNumber.toString().padStart(4, "0")}`,
      dateTime: transactionTime,
      cashier: user?.email || "Unknown",
      customer: paymentMethod === "credit" ? creditCustomer.name : undefined,
      paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
      totalAmount: total,
      referenceNumber:
        paymentMethod === "gcash" || paymentMethod === "paymaya" || paymentMethod === "card"
          ? referenceNumber
          : undefined,
      items: cart.map((item) => ({
        name: item.isCombo
          ? `${item.dish.name} (${item.comboItems?.map((ci) => ci.dish.name).join(", ")})`
          : item.dish.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }

    // Persist order to backend
    try {
      const branchNameToId: any = { exxa: 1, tera: 2, cnx: 3, all: 99 }
      const branchId = branchNameToId[(user as any)?.branch] ?? 1
      const normalizedMethod = paymentMethod === 'paymaya' ? 'paymaya' : paymentMethod
      // Expand cart into order items for backend
      const expandedItems: any[] = []
      for (const ci of cart) {
        if (!ci.isCombo) {
          expandedItems.push({
            item_id: ci.dish.id,
            name_snapshot: ci.dish.name,
            unit_price: ci.price,
            quantity: ci.size === 'half' ? ci.quantity * 0.5 : ci.quantity,
          })
        } else {
          // Combo: push each component as quantity aggregated
          const qty = ci.quantity
          for (const sub of (ci.comboItems || [])) {
            expandedItems.push({
              item_id: sub.dish.id,
              name_snapshot: sub.dish.name,
              unit_price: sub.price,
              quantity: sub.size === 'half' ? qty * 0.5 : qty,
            })
          }
          // Also add one rice if available in dishes list
          const rice = dishes.find((d) => d.category === 'Rice')
          if (rice) {
            expandedItems.push({
              item_id: rice.id,
              name_snapshot: rice.name,
              unit_price: rice.price,
              quantity: qty,
            })
          }
        }
      }
      const payload = {
        user_id: (user as any)?.id,
        branch_id: branchId,
        items: expandedItems,
        discount: 0,
        tax: 0,
        payment_method: normalizedMethod,
        reference_number: referenceNumber || null,
        notes: null,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data?.order_number) {
        // Build receipt from server order_number/id to avoid duplicates
        const serverOrderNumber = data.order_number
        const salesTransaction = {
          id: `TXN-${data.id}`,
          receiptNo: `RCP-${new Date().getFullYear()}-${String(serverOrderNumber).padStart(4, '0')}`,
          dateTime: transactionTime,
          cashier: user?.email || 'Unknown',
          customer: paymentMethod === 'credit' ? creditCustomer.name : undefined,
          paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1),
          totalAmount: total,
          referenceNumber: (paymentMethod === 'gcash' || paymentMethod === 'paymaya' || paymentMethod === 'card') ? referenceNumber : undefined,
          items: cart.map((item) => ({
            name: item.isCombo
              ? `${item.dish.name} (${item.comboItems?.map((ci) => ci.dish.name).join(', ')})`
              : item.dish.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }
        const existingSalesTransactions = JSON.parse(localStorage.getItem('salesTransactions') || '[]')
        existingSalesTransactions.push(salesTransaction)
        localStorage.setItem('salesTransactions', JSON.stringify(existingSalesTransactions))
        setOrderNumber(serverOrderNumber + 1)
      } else {
        throw new Error(data?.error || 'Order failed')
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Order failed', description: (e as any)?.message || 'Failed to process order', duration: 4000 })
      setProcessingCheckout(false)
      return
    }
    // Save to localStorage for Sales History handled above after server response

    const paymentDetails =
      paymentMethod === "cash"
        ? `₱${total.toFixed(2)} (Cash)`
        : paymentMethod === "credit"
          ? `₱${total.toFixed(2)} (Credit - ${creditCustomer.name})`
          : `₱${total.toFixed(2)} (${paymentMethod.toUpperCase()}${referenceNumber ? ` - Ref: ${referenceNumber}` : ""})`

    logActivity("order", `Order #${orderNumber} completed - ${paymentDetails}`, {
      orderNumber,
      total,
      paymentMethod,
      itemCount: cart.length,
      referenceNumber:
        paymentMethod === "gcash" || paymentMethod === "paymaya" || paymentMethod === "card"
          ? referenceNumber
          : undefined,
    })

    if (paymentMethod === "credit") {
      const existingCredits = JSON.parse(localStorage.getItem("creditTransactions") || "[]")
      const creditTransaction = {
        id: Date.now(),
        orderNumber,
        customerName: creditCustomer.name,
        customerContact: creditCustomer.contact,
        amount: total,
        timestamp: transactionTime,
        status: "unpaid",
        cashier: user?.email || "Unknown",
      }
      existingCredits.push(creditTransaction)
      localStorage.setItem("creditTransactions", JSON.stringify(existingCredits))
    }

    setCart([])
    setOrderNumber(orderNumber + 1)
    setShowPaymentModal(false)
    setAmountReceived(0)
    setCreditCustomer({ name: "", contact: "", amountOwed: 0 })
    setReferenceNumber("")

    setShowReceiptModal(true)
    setProcessingCheckout(false)
  }

  const printReceipt = () => {
    if (!lastTransaction) return

    const receiptContent = `
      ================================
           FOOD BUSINESS POS
      ================================
      
      Branch: ${user?.branch?.toUpperCase() || "MAIN"} BRANCH
      Address: 123 Business St., City
      Phone: (02) 123-4567
      Email: info@foodbusinesspos.com
      
      ================================
      
      Date: ${lastTransaction.timestamp.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      Time: ${lastTransaction.timestamp.toLocaleTimeString("en-PH")}
      Order #: ${lastTransaction.orderNumber}
      Cashier: ${lastTransaction.cashier}
      
      --------------------------------
      ITEMS ORDERED:
      --------------------------------
      ${lastTransaction.items
        .map((item: CartItem) => {
          let itemText = `${item.quantity}x ${item.dish.name}${item.size === "half" ? " (Half)" : ""}\n   ₱${item.price.toFixed(2)} each = ₱${(item.price * item.quantity).toFixed(2)}`

          if (item.isCombo && item.comboItems) {
            itemText += `\n   Combo includes:`
            item.comboItems.forEach((comboItem) => {
              itemText += `\n     - ${comboItem.dish.name}${comboItem.size === "half" ? " (Half)" : ""}`
            })
          }

          return itemText
        })
        .join("\n")}
      
      --------------------------------
      PAYMENT SUMMARY:
      --------------------------------
      Subtotal: ₱${lastTransaction.total.toFixed(2)}
      Tax (0%): ₱0.00
      Service Charge: ₱0.00
      
      TOTAL AMOUNT: ₱${lastTransaction.total.toFixed(2)}
      
      Payment Method: ${lastTransaction.paymentMethod.toUpperCase()}
      ${
        lastTransaction.paymentMethod === "cash"
          ? `Amount Received: ₱${lastTransaction.amountReceived.toFixed(2)}\nChange Given: ₱${lastTransaction.change.toFixed(2)}`
          : lastTransaction.paymentMethod === "credit"
            ? `Customer: ${lastTransaction.creditCustomer?.name || "N/A"}\nContact: ${lastTransaction.creditCustomer?.contact || "N/A"}\nStatus: CREDIT - PAYMENT PENDING`
            : `Payment Status: CONFIRMED\nTransaction ID: ${Date.now().toString().slice(-8)}`
      }
      
      ================================
      
      Thank you for dining with us!
      Please come again soon.
      
      For feedback or complaints:
      Email: feedback@foodbusinesspos.com
      Phone: (02) 123-4567
      
      ================================
      
      This serves as your official receipt.
      Please keep for your records.
      
      Printed: ${new Date().toLocaleString("en-PH")}
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Order #${lastTransaction.orderNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                margin: 20px;
                line-height: 1.4;
              }
              pre { 
                white-space: pre-wrap; 
                margin: 0;
              }
              @media print {
                body { margin: 0; }
                @page { margin: 0.5in; }
              }
            </style>
          </head>
          <body>
            <pre>${receiptContent}</pre>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const trackSoldOutEvent = (dishName: string) => {
    const existingSoldOutData = JSON.parse(localStorage.getItem("soldOutTracking") || "[]")
    const existingItem = existingSoldOutData.find((item: any) => item.dishName === dishName)

    if (existingItem) {
      existingItem.count += 1
      existingItem.lastMarkedSoldOut = new Date().toISOString()
    } else {
      existingSoldOutData.push({
        dishName,
        count: 1,
        lastMarkedSoldOut: new Date().toISOString(),
      })
    }

    localStorage.setItem("soldOutTracking", JSON.stringify(existingSoldOutData))
  }

  const SpinnerOverlay = () => (
    processingCheckout ? (
      <div style={{ position:'fixed', inset:0, background:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 2000 }}>
        <div style={{ width: 42, height: 42, border:'4px solid #2d5a27', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    ) : null
  )

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ height: 12, background: '#e9ecef', borderRadius: 6, width: 160, marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#f8f9fa', border: '1px solid #e9ecef', height: 120, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    )
  }

  const total = getCartTotal()

  return (
    <AuthGuard allowedRoles={["admin", "manager", "cashier"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/pos" />

        <main className="main-content">
          <SpinnerOverlay />
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Point of Sale</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <span style={{ color: "#6c757d" }}>Order #{orderNumber}</span>
              <span style={{ color: "#6c757d" }}>
                {new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", height: "calc(100vh - 140px)" }}>
            <div style={{ flex: "2", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="Search dishes by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "14px",
                      border: "2px solid #e9ecef",
                      borderRadius: "8px",
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

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={`btn ${selectedCategory === category ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "8px 16px", fontSize: "14px" }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-success"
                    style={{ padding: "8px 16px", fontSize: "14px", fontWeight: "600" }}
                    onClick={openComboModal}
                  >
                    🍽️ Create Combo Meal
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "15px",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {loadingItems && Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background:'#f8f9fa', border:'1px solid #e9ecef', borderRadius:8, height:120 }} />
                ))}
                {!loadingItems && filteredDishes.map((dish) => (
                  <div
                    key={dish.id}
                    style={{
                      background: "linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%)",
                      border: "1px solid #d4edda",
                      borderRadius: "8px",
                      padding: "15px",
                      boxShadow: "0 3px 8px rgba(45, 90, 39, 0.15)",
                      cursor: dish.available ? "pointer" : "not-allowed",
                      opacity: dish.available ? 1 : 0.6,
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                    onClick={() => dish.available && addToCart(dish)}
                    onMouseEnter={(e) => {
                      if (dish.available) {
                        e.currentTarget.style.transform = "translateY(-3px)"
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(45, 90, 39, 0.25)"
                        e.currentTarget.style.background = "linear-gradient(135deg, #ffffff 0%, #f0f8f0 100%)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.boxShadow = "0 3px 8px rgba(45, 90, 39, 0.15)"
                      e.currentTarget.style.background = "linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%)"
                    }}
                  >
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#2d5a27" }}>{dish.name}</h4>
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#6c757d" }}>{dish.category}</p>

                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "0.8rem",
                        color: dish.servingsAvailable <= 3 ? "#dc3545" : "#6c757d",
                      }}
                    >
                      Servings: {dish.servingsAvailable}/{dish.totalServings}
                      {dish.servingsAvailable <= 3 && dish.servingsAvailable > 0 && " (Low Stock)"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "600", color: "#2d5a27" }}>₱{dish.price}</span>
                        {dish.halfPrice && (
                          <span style={{ fontSize: "0.85rem", color: "#6c757d", marginLeft: "5px" }}>
                            / ₱{dish.halfPrice} (Half)
                          </span>
                        )}
                      </div>
                    </div>

                    {dish.available && (
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {dish.halfPrice && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px", flex: "1" }}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(dish, "half")
                            }}
                          >
                            Half
                          </button>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 8px", fontSize: "11px", flex: "1" }}
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(dish, "regular")
                          }}
                        >
                          Regular
                        </button>
                      </div>
                    )}

                    {!dish.available && (
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          background: "#dc3545",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        Sold Out
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: "1",
                background: "white",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                minWidth: "350px",
              }}
            >
              <h3 style={{ margin: "0 0 20px 0", color: "#2d5a27", display: "flex", justifyContent: "space-between" }}>
                Order Cart
                <span style={{ fontSize: "1rem", fontWeight: "normal", color: "#6c757d" }}>
                  {getCartItemCount()} items
                </span>
              </h3>

              <div style={{ flex: 1, overflowY: "auto", marginBottom: "20px" }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6c757d", padding: "40px 0" }}>
                    <p>No items in cart</p>
                    <p style={{ fontSize: "0.9rem" }}>Click on dishes to add them</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: "1px solid #e9ecef",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                          {item.dish.name}
                          {item.size === "half" && !item.isCombo && (
                            <span style={{ fontSize: "0.8rem", color: "#6c757d", marginLeft: "5px" }}>(Half)</span>
                          )}
                          {item.isCombo && (
                            <span style={{ fontSize: "0.8rem", color: "#28a745", marginLeft: "5px" }}>(Combo)</span>
                          )}
                        </h5>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#6c757d" }}>
                          ₱{item.price.toFixed(2)} each
                        </p>
                        {item.isCombo && item.comboItems && (
                          <div style={{ fontSize: "0.75rem", color: "#6c757d", marginTop: "4px" }}>
                            Includes:{" "}
                            {item.comboItems
                              .map((ci) => `${ci.dish.name}${ci.size === "half" ? " (Half)" : ""}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          style={{
                            background: "#e9ecef",
                            border: "none",
                            borderRadius: "4px",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span style={{ minWidth: "20px", textAlign: "center", fontWeight: "600" }}>
                          {item.quantity}
                        </span>
                        <button
                          style={{
                            background: "#e9ecef",
                            border: "none",
                            borderRadius: "4px",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                        >
                          +
                        </button>
                        <button
                          style={{
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer",
                            marginLeft: "8px",
                          }}
                          onClick={() => removeFromCart(index)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ borderTop: "2px solid #2d5a27", paddingTop: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#2d5a27" }}>Total:</h3>
                  <h3 style={{ margin: 0, color: "#2d5a27" }}>₱{total.toFixed(2)}</h3>
                </div>

                <button
                  className="btn btn-success w-full"
                  style={{ padding: "15px", fontSize: "1.1rem", fontWeight: "600" }}
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                >
                  Process Payment
                </button>
              </div>
            </div>
          </div>

          {showComboModal && (
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
              onClick={() => setShowComboModal(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "800px",
                  width: "90%",
                  maxHeight: "80vh",
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Create Combo Meal</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowComboModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#2d5a27" }}>{defaultCombo.name}</h4>
                  <p style={{ margin: "0 0 8px 0", color: "#6c757d" }}>{defaultCombo.description}</p>
                  <div style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                    <strong>Fixed Price: ₱{comboMealPrice}</strong> (includes 1 rice + your selected dishes)
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#28a745", marginTop: "4px" }}>
                    Great value! Add any combination of dishes for the same price.
                  </div>
                </div>

                <h4 style={{ color: "#2d5a27", marginBottom: "15px" }}>Selected Dishes ({comboItems.length}):</h4>

                {comboItems.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    {comboItems.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "#e8f5e8",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      >
                        <span>
                          {item.dish.name} {item.size === "half" && "(Half)"}
                        </span>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => removeComboItem(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div style={{ padding: "8px 12px", background: "#d4edda", borderRadius: "4px", fontWeight: "600" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Total Combo Price:</span>
                        <span style={{ fontSize: "1.2rem", color: "#2d5a27" }}>₱{comboMealPrice}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "4px" }}>
                        Fixed price includes: 1 rice + {comboItems.length} selected dish
                        {comboItems.length !== 1 ? "es" : ""}
                      </div>
                    </div>
                  </div>
                )}

                <h4 style={{ color: "#2d5a27", marginBottom: "15px" }}>Add Dishes to Combo:</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "10px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    marginBottom: "20px",
                  }}
                >
                  {dishes
                    .filter((dish) => dish.available && dish.category !== "Rice")
                    .map((dish) => (
                      <div
                        key={dish.id}
                        style={{
                          border: "1px solid #dee2e6",
                          borderRadius: "6px",
                          padding: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f8f9fa"
                          e.currentTarget.style.borderColor = "#2d5a27"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white"
                          e.currentTarget.style.borderColor = "#dee2e6"
                        }}
                      >
                        <h6 style={{ margin: "0 0 4px 0", fontSize: "0.9rem" }}>{dish.name}</h6>
                        <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#6c757d" }}>
                          {dish.category} - {dish.servingsAvailable} left
                        </p>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {dish.halfPrice && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "2px 6px", fontSize: "10px", flex: "1" }}
                              onClick={() => addComboItemToDish(dish, "half")}
                            >
                              Half (₱{dish.halfPrice})
                            </button>
                          )}
                          <button
                            className="btn btn-primary"
                            style={{ padding: "2px 6px", fontSize: "10px", flex: "1" }}
                            onClick={() => addComboItemToDish(dish, "regular")}
                          >
                            Regular (₱{dish.price})
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowComboModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={addComboToCart} disabled={comboItems.length === 0}>
                    Add Combo to Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPaymentModal && (
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Process Payment</h2>
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
                  <h3 style={{ margin: "0 0 10px 0", color: "#2d5a27" }}>Order Summary</h3>
                  {cart.map((item, index) => (
                    <div key={index} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span>
                        {item.quantity}× {item.dish.name} {item.size === "half" && !item.isCombo && "(Half)"}
                        {item.isCombo && "(Combo)"}
                      </span>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "1px solid #dee2e6",
                      paddingTop: "10px",
                      marginTop: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "600",
                      fontSize: "1.1rem",
                    }}
                  >
                    <span>Total:</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
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
                    <option value="credit">Credit (Utang Muna)</option>
                  </select>
                </div>

                {paymentMethod === "cash" && (
                  <div className="form-group">
                    <label className="form-label">Amount Received (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(Number.parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount received"
                    />
                    {amountReceived > 0 && (
                      <p style={{ margin: "5px 0 0 0", color: amountReceived >= total ? "#28a745" : "#dc3545" }}>
                        Change: ₱{Math.max(0, amountReceived - total).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === "credit" && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Customer Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={creditCustomer.name}
                        onChange={(e) => setCreditCustomer({ ...creditCustomer, name: e.target.value })}
                        placeholder="Enter customer name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={creditCustomer.contact}
                        onChange={(e) => setCreditCustomer({ ...creditCustomer, contact: e.target.value })}
                        placeholder="Enter contact number"
                        required
                      />
                    </div>
                    <div style={{ background: "#fff3cd", padding: "10px", borderRadius: "4px", marginTop: "10px" }}>
                      <small style={{ color: "#856404" }}>
                        <strong>Note:</strong> This transaction will be recorded as credit. Customer will owe ₱
                        {total.toFixed(2)}.
                      </small>
                    </div>
                  </div>
                )}

                {(paymentMethod === "paymaya" || paymentMethod === "gcash" || paymentMethod === "card") && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">
                        Reference Number *{paymentMethod === "gcash" && " (GCash Transaction ID)"}
                        {paymentMethod === "paymaya" && " (PayMaya Transaction ID)"}
                        {paymentMethod === "card" && " (Card Transaction ID)"}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder={`Enter ${paymentMethod} reference number`}
                        required
                      />
                      <small style={{ color: "#6c757d", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        This reference number will be stored for record keeping and verification.
                      </small>
                    </div>

                    <div style={{ background: "#d1ecf1", padding: "15px", borderRadius: "6px", marginTop: "15px" }}>
                      <p style={{ margin: "0 0 10px 0", color: "#0c5460", fontWeight: "600" }}>
                        {paymentMethod === "paymaya" && "PayMaya Payment"}
                        {paymentMethod === "gcash" && "GCash Payment"}
                        {paymentMethod === "card" && "Card Payment"}
                      </p>
                      <p style={{ margin: 0, color: "#0c5460", fontSize: "0.9rem" }}>
                        Amount to be charged: ₱{total.toFixed(2)}
                      </p>
                      <p style={{ margin: "5px 0 0 0", color: "#0c5460", fontSize: "0.8rem" }}>
                        Please ensure payment is completed before confirming the sale.
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handlePayment}
                    disabled={
                      (paymentMethod === "cash" && amountReceived < total) ||
                      (paymentMethod === "credit" && (!creditCustomer.name || !creditCustomer.contact)) ||
                      ((paymentMethod === "gcash" || paymentMethod === "paymaya" || paymentMethod === "card") &&
                        !referenceNumber.trim())
                    }
                  >
                    {processingCheckout ? 'Processing…' : 'Confirm Sale'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReceiptModal && lastTransaction && (
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
              onClick={() => setShowReceiptModal(false)}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "30px",
                  maxWidth: "400px",
                  width: "90%",
                  maxHeight: "80vh",
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Transaction Complete</h2>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      color: "#6c757d",
                    }}
                    onClick={() => setShowReceiptModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                    fontFamily: "'Courier New', monospace",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    border: "1px solid #dee2e6",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "15px" }}>
                    <strong style={{ fontSize: "14px" }}>FOOD BUSINESS POS</strong>
                    <br />
                    <span style={{ fontSize: "10px" }}>{user?.branch?.toUpperCase() || "MAIN"} BRANCH</span>
                    <br />
                    ================================
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <strong>Date:</strong> {lastTransaction.timestamp.toLocaleDateString("en-PH")}
                    <br />
                    <strong>Time:</strong> {lastTransaction.timestamp.toLocaleTimeString("en-PH")}
                    <br />
                    <strong>Order #:</strong> {lastTransaction.orderNumber}
                    <br />
                    <strong>Cashier:</strong> {lastTransaction.cashier}
                  </div>

                  <div style={{ borderTop: "1px dashed #666", paddingTop: "10px", marginBottom: "15px" }}>
                    <strong>ITEMS ORDERED:</strong>
                    <br />
                    {lastTransaction.items.map((item: CartItem, index: number) => (
                      <div key={index} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>
                            {item.quantity}x {item.dish.name}
                            {item.size === "half" && !item.isCombo ? " (Half)" : ""}
                            {item.isCombo ? " (Combo)" : ""}
                          </span>
                          <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#666", marginLeft: "10px" }}>
                          ₱{item.price.toFixed(2)} each
                        </div>
                        {item.isCombo && item.comboItems && (
                          <div style={{ fontSize: "9px", color: "#666", marginLeft: "15px" }}>
                            Includes:{" "}
                            {item.comboItems
                              .map((ci) => `${ci.dish.name}${ci.size === "half" ? " (Half)" : ""}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px dashed #666", paddingTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>SUBTOTAL:</strong>
                      <strong>₱{lastTransaction.total.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>TAX (0%):</span>
                      <span>₱0.00</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderTop: "1px solid #333",
                        paddingTop: "5px",
                        marginTop: "5px",
                      }}
                    >
                      <strong>TOTAL:</strong>
                      <strong>₱{lastTransaction.total.toFixed(2)}</strong>
                    </div>
                    <br />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>PAYMENT:</strong>
                      <strong>{lastTransaction.paymentMethod.toUpperCase()}</strong>
                    </div>
                    {lastTransaction.paymentMethod === "cash" && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Amount Received:</span>
                          <span>₱{lastTransaction.amountReceived.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Change:</span>
                          <span>₱{lastTransaction.change.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {lastTransaction.referenceNumber && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Reference #:</span>
                        <span>{lastTransaction.referenceNumber}</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{ textAlign: "center", marginTop: "15px", borderTop: "1px dashed #666", paddingTop: "10px" }}
                  >
                    <strong>Thank you for your business!</strong>
                    <br />
                    <span style={{ fontSize: "10px" }}>Please come again soon.</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ minWidth: "100px", padding: "12px 20px" }}
                    onClick={() => setShowReceiptModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ minWidth: "120px", padding: "12px 20px" }}
                    onClick={printReceipt}
                  >
                    🖨️ Print Receipt
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
