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

interface Dish {
  id: number
  name: string
  servings: number
  pricePerServing: number
  cost: number
  totalSellingPrice: number
  profit: number
  profitPerServing: number
  ingredients: Ingredient[]
  category: string
  status: "available" | "hidden"
}

interface Ingredient {
  name: string
  quantity: number
  unit: string
  cost: number
}

const measurementUnits = ["kg", "g", "L", "mL", "pcs", "cups", "tbsp", "tsp", "lbs", "oz"]

const dishCategories = ["MEALS", "EXTRA RICE", "PASTA/PANSIT", "P.SNACKS", "SANDWICH", "DRINKS", "SIOMAI/DUMPLINGS", "GROCERIES", "PASTRIES", "OTHERS", "BANANA", "KAKANIN", "UTENSILS"]

const unitConversions: { [key: string]: { [key: string]: number } } = {
  // Weight conversions (base: grams)
  kg: { g: 1000, kg: 1, lbs: 2.20462, oz: 35.274 },
  g: { g: 1, kg: 0.001, lbs: 0.00220462, oz: 0.035274 },
  lbs: { g: 453.592, kg: 0.453592, lbs: 1, oz: 16 },
  oz: { g: 28.3495, kg: 0.0283495, lbs: 0.0625, oz: 1 },

  // Volume conversions (base: milliliters)
  L: { mL: 1000, L: 1, cups: 4.22675, tbsp: 67.628, tsp: 202.884 },
  mL: { mL: 1, L: 0.001, cups: 0.00422675, tbsp: 0.067628, tsp: 0.202884 },
  cups: { mL: 236.588, L: 0.236588, cups: 1, tbsp: 16, tsp: 48 },
  tbsp: { mL: 14.7868, L: 0.0147868, cups: 0.0625, tbsp: 1, tsp: 3 },
  tsp: { mL: 4.92892, L: 0.00492892, cups: 0.0208333, tbsp: 0.333333, tsp: 1 },

  // Count conversions (no conversion needed)
  pcs: { pcs: 1 },
}

const convertUnits = (fromAmount: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return fromAmount

  const fromConversions = unitConversions[fromUnit]
  const toConversions = unitConversions[toUnit]

  if (!fromConversions || !toConversions) {
    console.warn(`Unit conversion not supported: ${fromUnit} to ${toUnit}`)
    return fromAmount // Return original if conversion not supported
  }

  // Check if direct conversion exists
  if (fromConversions[toUnit]) {
    return fromAmount * fromConversions[toUnit]
  }

  // Check if they're in the same category (weight or volume)
  const weightUnits = ["kg", "g", "lbs", "oz"]
  const volumeUnits = ["L", "mL", "cups", "tbsp", "tsp"]

  const fromIsWeight = weightUnits.includes(fromUnit)
  const toIsWeight = weightUnits.includes(toUnit)
  const fromIsVolume = volumeUnits.includes(fromUnit)
  const toIsVolume = volumeUnits.includes(toUnit)

  if ((fromIsWeight && toIsWeight) || (fromIsVolume && toIsVolume)) {
    // Convert to base unit first, then to target unit
    const baseUnit = fromIsWeight ? "g" : "mL"
    const baseAmount = fromAmount * fromConversions[baseUnit]
    return baseAmount * toConversions[toUnit]
  }

  console.warn(`Cannot convert between different unit types: ${fromUnit} to ${toUnit}`)
  return fromAmount
}

export default function DishesPage() {
  const [inventoryItems, setInventoryItems] = useState<Array<{ name: string; unit: string; costPerUnit: number; stock: number }>>([]);
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("sidebarCollapsed") || "false")
    } catch {
      return false
    }
  })

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [newDishImageUrl, setNewDishImageUrl] = useState<string>("")
  const [formError, setFormError] = useState<string>("")
  const [uploading, setUploading] = useState<boolean>(false)
  const [newDish, setNewDish] = useState<Dish>({
    id: 0,
    name: "",
    servings: 1,
    pricePerServing: 0,
    cost: 0,
    totalSellingPrice: 0,
    profit: 0,
    profitPerServing: 0,
    ingredients: [],
    category: "MEALS",
    status: "available",
  })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.json())
      .then((rows) => {
        if (Array.isArray(rows)) {
          // Map inventory items to ingredient names, units, cost, and stock
          setInventoryItems(
            rows
              .filter((item: any) => {
                // Only show items with quantity > 0 and valid ingredient name
                return (Number(item.quantity ?? item.stock ?? 0) > 0) && (item.ingredient || item.name)
              })
              .map((item: any) => ({
                name: item.ingredient || item.name,
                unit: item.unit || (item.default_unit ?? "kg"),
                costPerUnit: Number(item.unitCost ?? item.cost_per_unit ?? 0),
                stock: Number(item.quantity ?? item.stock ?? 0),
              }))
          )
        }
      })
      .catch((error) => {
        console.error('Failed to fetch inventory:', error)
      })
  }, [])

  // Load categories and items
  useEffect(() => {
    if (inventoryItems.length === 0) return;
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
    // Load categories and items
    Promise.all([
      fetch('/api/categories').then(r => r.json()).then(data => Array.isArray(data) ? data : []).catch(() => []),
      fetch('/api/items').then(r => r.json()).then(data => Array.isArray(data) ? data : []).catch(() => []),
      fetch('/api/recipes').then(r => r.json()).then(data => Array.isArray(data) ? data : []).catch(() => []),
      fetch('/api/ingredients').then(r => r.json()).then(data => Array.isArray(data) ? data : []).catch(() => []),
    ]).then(([cats, items, allRecipes, allIngredients]) => {
      if (Array.isArray(items)) {
        const ingredientMap = new Map(allIngredients.map((ing: any) => [ing.id, ing.name]));
        const recipeMap = new Map<number, any[]>();
        allRecipes.forEach((recipe: any) => {
          if (!recipeMap.has(recipe.item_id)) recipeMap.set(recipe.item_id, []);
          recipeMap.get(recipe.item_id)!.push({
            name: ingredientMap.get(recipe.ingredient_id) || '',
            quantity: recipe.quantity,
            unit: recipe.recipe_unit,
            cost: calculateIngredientCost(ingredientMap.get(recipe.ingredient_id) || '', recipe.quantity, recipe.recipe_unit)
          });
        });
        setDishes(items.map((r: any) => {
          const ingredients = recipeMap.get(r.id) || [];
          const cost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
          const totalSellingPrice = (r.total_servings ?? 0) * Number(r.price ?? 0);
          const profit = totalSellingPrice - cost;
          const profitPerServing = (r.total_servings ?? 0) > 0 ? profit / (r.total_servings ?? 0) : 0;
          return {
            id: r.id,
            name: r.name,
            servings: r.total_servings ?? 0,
            pricePerServing: Number(r.price ?? 0),
            cost,
            totalSellingPrice,
            profit,
            profitPerServing,
            category: r.category || 'Uncategorized',
            status: r.available ? 'available' : 'hidden',
            ingredients,
          };
        }));
      }
      if (Array.isArray(cats)) {
        setCategories(cats.filter((c: any) => c && c.id && c.name));
      }
    })
  }, [inventoryItems.length])

  // Keep localStorage in sync with sidebar state
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  const calculateIngredientCost = (ingredientName: string, quantity: number, recipeUnit: string) => {
    const inventoryItem = inventoryItems.find((item) => item.name === ingredientName)
    if (inventoryItem) {
      // Convert recipe quantity to inventory unit for cost calculation
      const convertedQuantity = convertUnits(quantity, recipeUnit, inventoryItem.unit)
      const cost = inventoryItem.costPerUnit * convertedQuantity

      console.log(`[v0] Cost calculation for ${ingredientName}:`)
      console.log(`[v0] Recipe: ${quantity} ${recipeUnit}`)
      console.log(`[v0] Inventory: ${inventoryItem.costPerUnit} per ${inventoryItem.unit}`)
      console.log(`[v0] Converted: ${convertedQuantity.toFixed(4)} ${inventoryItem.unit}`)
      console.log(`[v0] Total cost: ₱${cost.toFixed(2)}`)

      return cost
    }
    return 0
  }

  const calculateTotalSellingPrice = (servings: number, pricePerServing: number) => {
    return servings * pricePerServing
  }

  const calculateProfit = (totalSellingPrice: number, cost: number) => {
    return totalSellingPrice - cost
  }

  const calculateProfitPerServing = (totalSellingPrice: number, cost: number, servings: number) => {
    const profit = totalSellingPrice - cost
    return servings > 0 ? profit / servings : 0
  }

  const addIngredientToNewDish = () => {
    setNewDish({
      ...newDish,
      ingredients: [...newDish.ingredients, { name: "", quantity: 0, unit: "", cost: 0 }],
    })
  }

  const handleNewDishIngredientChange = (index: number, field: string, value: string | number) => {
    const updatedIngredients = [...newDish.ingredients]
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value }

    // Auto-set unit when ingredient name is selected
    if (field === "name" && value) {
      const selectedInventoryItem = inventoryItems.find(item => item.name === value)
      if (selectedInventoryItem) {
        updatedIngredients[index].unit = selectedInventoryItem.unit
      }
    }

    if (field === "name" || field === "quantity" || field === "unit") {
      const ingredient = updatedIngredients[index]
      if (ingredient.name && ingredient.quantity > 0) {
        updatedIngredients[index].cost = calculateIngredientCost(ingredient.name, ingredient.quantity, ingredient.unit)
      }
    }

    const totalCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
    const totalSellingPrice = calculateTotalSellingPrice(newDish.servings, newDish.pricePerServing)
    const profit = calculateProfit(totalSellingPrice, totalCost)
    const profitPerServing = calculateProfitPerServing(totalSellingPrice, totalCost, newDish.servings)

    setNewDish({
      ...newDish,
      ingredients: updatedIngredients,
      cost: totalCost,
      totalSellingPrice,
      profit,
      profitPerServing,
    })
  }

  const handleNewDishPriceChange = (field: string, value: number) => {
    const updatedDish = { ...newDish, [field]: value }

    if (field === "servings" || field === "pricePerServing") {
      // For Groceries & Others, recalculate cost when quantity changes
      if (newDish.category === "Groceries & Others" && field === "servings") {
        const selectedItem = inventoryItems.find(item => item.name === newDish.name);
        if (selectedItem) {
          updatedDish.cost = selectedItem.costPerUnit * value;
        }
      }

      updatedDish.totalSellingPrice = calculateTotalSellingPrice(
        field === "servings" ? value : newDish.servings,
        field === "pricePerServing" ? value : newDish.pricePerServing,
      )
      updatedDish.profit = calculateProfit(updatedDish.totalSellingPrice, updatedDish.cost)
      updatedDish.profitPerServing = calculateProfitPerServing(
        updatedDish.totalSellingPrice,
        updatedDish.cost,
        field === "servings" ? value : newDish.servings,
      )
    }

    setNewDish(updatedDish)
  }

  const toggleDishStatus = (dishId: number) => {
    setDishes(
      dishes.map((dish) =>
        dish.id === dishId ? { ...dish, status: dish.status === "available" ? "hidden" : "available" } : dish,
      ),
    )
  }

  const deleteDish = async (dishId: number) => {
    if (confirm("Are you sure you want to delete this dish? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/items?id=${dishId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          // Remove from local state only after successful API call
          setDishes(dishes.filter((dish) => dish.id !== dishId))
          alert('Dish deleted successfully!')
        } else {
          const error = await response.json()
          alert(`Failed to delete dish: ${error.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Delete error:', error)
        alert('Failed to delete dish. Please try again.')
      }
    }
  }

  const getSortedDishes = () => {
    const filtered = dishes.filter((dish) => {
      const matchesCategory = selectedCategory === "All" || dish.category === selectedCategory
      const matchesSearch =
        searchQuery === "" ||
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })

    return filtered.sort((a, b) => {
      if (a.status === "available" && b.status === "hidden") return -1
      if (a.status === "hidden" && b.status === "available") return 1
      return 0
    })
  }

  const handleSaveNewDish = async () => {
    const selectedCat = categories.find((c) => c.name === newDish.category)
    const isValidPredefinedCategory = dishCategories.includes(newDish.category)
    const errors: string[] = []
    if (!newDish.name.trim()) errors.push('Dish name is required')
    if (!selectedCat && !isValidPredefinedCategory) errors.push('Please select a valid category')
    if (newDish.servings <= 0) errors.push('Servings must be greater than 0')
    if (newDish.pricePerServing < 0) errors.push('Price per serving must be 0 or more')
    if (newDish.category !== "Groceries & Others" && newDish.ingredients.length === 0) errors.push('Add at least one ingredient')
    setFormError(errors.join('\n'))
    if (errors.length) return

    try {
      const cat = newDish.category || 'Uncategorized'

      // Ensure category exists in database
      let categoryId = selectedCat?.id
      if (!categoryId && isValidPredefinedCategory) {
        // Create the category if it doesn't exist
        const categoryRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newDish.category })
        })
        if (categoryRes.ok) {
          const categoryData = await categoryRes.json()
          categoryId = categoryData.id
        }
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDish.name,
          price: newDish.pricePerServing,
          category_id: categoryId ?? null,
          available: newDish.status !== 'hidden',
          servings_available: newDish.servings,
          total_servings: newDish.servings,
          image_url: newDishImageUrl || null,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create item')
        return
      }
      const itemId = data.id

      // Ensure ingredients exist and upsert recipe
      const ingRes = await fetch('/api/ingredients')
      const ingList = await ingRes.json()
      for (const ing of newDish.ingredients) {
        let found = Array.isArray(ingList) ? ingList.find((x: any) => (x.name || '').toLowerCase() === ing.name.toLowerCase()) : null
        if (!found) {
          const created = await fetch('/api/ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ing.name, default_unit: ing.unit, cost_per_unit: ing.cost || 0 })
          })
          const cData = await created.json()
          found = { id: cData.id, name: ing.name }
        }
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId, ingredient_id: found.id, quantity: ing.quantity || 0, recipe_unit: ing.unit || 'unit' })
        })
      }

      const added: Dish = { ...newDish, id: itemId }
      setDishes([...dishes, added])
      setShowAddModal(false)
      setFormError("")
    } catch (e) {
      console.error(e)
      setFormError('Failed to create item')
    }
    setNewDish({
      id: 0,
      name: "",
      servings: 1,
      pricePerServing: 0,
      cost: 0,
      totalSellingPrice: 0,
      profit: 0,
      profitPerServing: 0,
      ingredients: [],
      category: "MEALS",
      status: "available",
    })
    setNewDishImageUrl("")
  }

  const handleEditDish = (dish: Dish) => {
    setSelectedDish({ ...dish })
    setEditMode(true)
    setShowModal(true)
  }

  const handleViewDish = (dish: Dish) => {
    setSelectedDish(dish)
    setEditMode(false)
    setShowModal(true)
  }

  const handleSaveDish = async () => {
    if (!selectedDish) return
    try {
      const selectedCat = categories.find((c) => c.name === selectedDish.category)
      await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedDish.id,
          name: selectedDish.name,
          price: selectedDish.pricePerServing,
          category_id: selectedCat?.id ?? null,
          available: selectedDish.status !== 'hidden',
          servings_available: selectedDish.servings,
          total_servings: selectedDish.servings,
        })
      })
      // Sync recipe: upsert desired, delete removed
      const existingRows = await fetch(`/api/recipes?item_id=${selectedDish.id}`).then(r => r.json()).catch(() => [])
      const ingAll = await fetch('/api/ingredients').then(r => r.json()).catch(() => [])
      const desired = selectedDish.ingredients
      const desiredIds: number[] = []
      for (const ing of desired) {
        let found = Array.isArray(ingAll) ? ingAll.find((x: any) => (x.name || '').toLowerCase() === ing.name.toLowerCase()) : null
        if (!found) {
          const created = await fetch('/api/ingredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ing.name, default_unit: ing.unit, cost_per_unit: ing.cost || 0 })
          })
          const cData = await created.json()
          found = { id: cData.id, name: ing.name }
        }
        desiredIds.push(found.id)
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: selectedDish.id, ingredient_id: found.id, quantity: ing.quantity || 0, recipe_unit: ing.unit || 'unit' })
        })
      }
      if (Array.isArray(existingRows)) {
        for (const ex of existingRows) {
          if (!desiredIds.includes(ex.ingredient_id)) {
            await fetch('/api/recipes', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ item_id: selectedDish.id, ingredient_id: ex.ingredient_id })
            })
          }
        }
      }
      const updatedDishes = dishes.map((dish) => (dish.id === selectedDish.id ? selectedDish : dish))
      setDishes(updatedDishes)
      setShowModal(false)
      setSelectedDish(null)
    } catch (e) {
      console.error(e)
      setFormError('Failed to update item')
    }
  }

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    if (!selectedDish) return

    const updatedIngredients = [...selectedDish.ingredients]
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value }

    if (field === "name" || field === "quantity" || field === "unit") {
      const ingredient = updatedIngredients[index]
      if (ingredient.name && ingredient.quantity > 0) {
        updatedIngredients[index].cost = calculateIngredientCost(ingredient.name, ingredient.quantity, ingredient.unit)
      }
    }

    const totalCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
    const totalSellingPrice = calculateTotalSellingPrice(selectedDish.servings, selectedDish.pricePerServing)
    const profit = calculateProfit(totalSellingPrice, totalCost)
    const profitPerServing = calculateProfitPerServing(totalSellingPrice, totalCost, selectedDish.servings)

    setSelectedDish({
      ...selectedDish,
      ingredients: updatedIngredients,
      cost: totalCost,
      totalSellingPrice,
      profit,
      profitPerServing,
    })
  }

  const handleSelectedDishPriceChange = (field: string, value: number) => {
    if (!selectedDish) return

    const updatedDish = { ...selectedDish, [field]: value }

    if (field === "servings" || field === "pricePerServing") {
      updatedDish.totalSellingPrice = calculateTotalSellingPrice(
        field === "servings" ? value : selectedDish.servings,
        field === "pricePerServing" ? value : selectedDish.pricePerServing,
      )
      updatedDish.profit = calculateProfit(updatedDish.totalSellingPrice, selectedDish.cost)
      updatedDish.profitPerServing = calculateProfitPerServing(
        updatedDish.totalSellingPrice,
        selectedDish.cost,
        field === "servings" ? value : selectedDish.servings,
      )
    }

    setSelectedDish(updatedDish)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const sortedDishes = getSortedDishes()

  return (
    <AuthGuard allowedRoles={["admin", "supervisor"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/dishes" />

        <main
          className="main-content"
          style={{
            marginLeft: "2vw",
            marginRight: "2vw",
            width: "calc(100% - 4vw)",
            transition: "margin-left 260ms ease, width 260ms ease",
          }}
        >
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Dishes & Item Management</h1>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add New Dish
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Menu Items</h3>
              <div style={{ marginBottom: "15px" }}>
                <input
                  type="text"
                  placeholder="Search dishes by name, category, or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "500px",
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
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "15px" }}>
                <button
                  className={`btn ${selectedCategory === "All" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "6px 12px", fontSize: "14px" }}
                  onClick={() => setSelectedCategory("All")}
                >
                  All ({dishes.length})
                </button>
                {dishCategories.map((category) => {
                  const count = dishes.filter((dish) => dish.category === category).length
                  return (
                    <button
                      key={category}
                      className={`btn ${selectedCategory === category ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "14px" }}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category} ({count})
                    </button>
                  )
                })}
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Dish Name</th>
                  <th>Category</th>
                  <th>Servings</th>
                  <th>Price/Serving</th>
                  <th>Recipe Cost</th>
                  <th>Total Selling Price</th>
                  <th>Profit</th>
                  <th>Profit/Serving</th>
                  <th>Margin %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDishes.map((dish) => (
                  <tr
                    key={dish.id}
                    style={{
                      opacity: dish.status === "hidden" ? 0.6 : 1,
                      background: dish.status === "hidden" ? "#f8f9fa" : "white",
                    }}
                  >
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: dish.status === "available" ? "#d4edda" : "#f8d7da",
                          color: dish.status === "available" ? "#155724" : "#721c24",
                        }}
                      >
                        {dish.status === "available" ? "🟢 Available" : "🔴 Hidden"}
                      </span>
                    </td>
                    <td style={{ fontWeight: "600" }}>{dish.name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          background: "#e9ecef",
                          color: "#495057",
                        }}
                      >
                        {dish.category}
                      </span>
                    </td>
                    <td>{dish.servings}</td>
                    <td>₱{dish.pricePerServing.toFixed(2)}</td>
                    <td>₱{dish.cost.toFixed(2)}</td>
                    <td>₱{dish.totalSellingPrice.toFixed(2)}</td>
                    <td style={{ color: "#28a745", fontWeight: "600" }}>₱{dish.profit.toFixed(2)}</td>
                    <td style={{ color: "#28a745", fontWeight: "600" }}>₱{dish.profitPerServing.toFixed(2)}</td>
                    <td style={{ color: "#28a745", fontWeight: "600" }}>
                      {dish.totalSellingPrice > 0 ? ((dish.profit / dish.totalSellingPrice) * 100).toFixed(1) : 0}%
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => handleViewDish(dish)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => handleEditDish(dish)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn ${dish.status === "available" ? "btn-warning" : "btn-success"}`}
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => toggleDishStatus(dish.id)}
                        >
                          {dish.status === "available" ? "Hide" : "Show"}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => deleteDish(dish.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>Add New Dish</h2>
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
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  {formError && (
                    <div style={{ gridColumn: '1 / -1', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: 6, padding: 12 }}>
                      {formError.split('\n').map((line, i) => (
                        <div key={i}>• {line}</div>
                      ))}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{newDish.category === "Groceries & Others" ? "Item Name" : "Dish Name"}</label>
                    {newDish.category === "Groceries & Others" ? (
                      <select
                        className="form-select"
                        style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                        value={newDish.name}
                        onChange={(e) => {
                          const selectedItem = inventoryItems.find(item => item.name === e.target.value);
                          if (selectedItem) {
                            const totalCost = selectedItem.costPerUnit * newDish.servings;
                            setNewDish({
                              ...newDish,
                              name: e.target.value,
                              pricePerServing: selectedItem.costPerUnit,
                              cost: totalCost
                            });
                          } else {
                            setNewDish({
                              ...newDish,
                              name: e.target.value,
                              pricePerServing: 0,
                              cost: 0
                            });
                          }
                        }}
                      >
                        <option value="">Select inventory item...</option>
                        {inventoryItems.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name} - ₱{item.costPerUnit.toFixed(2)}/{item.unit} (Stock: {item.stock})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                        value={newDish.name}
                        onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                        placeholder="Enter dish name"
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.category}
                      onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                    >
                      {(() => {
                        // Combine dishCategories with database categories, removing duplicates
                        const dbCategoryNames = categories.map(c => c.name);
                        const allCategories = [...dishCategories];

                        // Add database categories that aren't already in dishCategories
                        categories.forEach(c => {
                          if (!dishCategories.includes(c.name)) {
                            allCategories.push(c.name);
                          }
                        });

                        return allCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {newDish.category === "Groceries & Others" ? "Quantity Available" : "Number of Servings"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.servings === 0 ? "" : String(newDish.servings)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+(?!$)/, "");
                        handleNewDishPriceChange("servings", val === "" ? 0 : Number.parseInt(val));
                      }}
                      placeholder={newDish.category === "Groceries & Others" ? "e.g., 50" : "e.g., 4"}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {newDish.category === "Groceries & Others" ? "Selling Price per Item (₱)" : "Selling Price per Serving (₱)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.pricePerServing}
                      onChange={(e) =>
                        handleNewDishPriceChange("pricePerServing", Number.parseFloat(e.target.value) || 0)
                      }
                      placeholder={newDish.category === "Groceries & Others" ? "Enter your selling price" : "Enter price per serving"}
                    />
                    {newDish.category === "Groceries & Others" && (
                      <small style={{ color: "#6c757d", fontSize: "12px", display: "block", marginTop: "4px" }}>
                        Set your desired selling price (cost per unit: ₱{(() => {
                          const selectedItem = inventoryItems.find(item => item.name === newDish.name);
                          return selectedItem ? selectedItem.costPerUnit.toFixed(2) : "0.00";
                        })()})
                      </small>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={newDishImageUrl}
                    onChange={(e) => setNewDishImageUrl(e.target.value)}
                    placeholder="Enter image URL"
                  />
                </div>

                {newDish.category !== "Groceries & Others" && (
                  <div style={{ marginBottom: "30px" }}>
                    <h3 style={{ marginBottom: "15px", color: "#2d5a27" }}>Ingredients</h3>
                    {newDish.ingredients.map((ingredient, index) => (
                      <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                        <select
                          className="form-select"
                          style={{ flex: 1, padding: "8px", fontSize: "14px" }}
                          value={ingredient.name}
                          onChange={(e) => handleNewDishIngredientChange(index, "name", e.target.value)}
                        >
                          <option value="">Select ingredient</option>
                          {inventoryItems.map((item) => (
                            <option key={item.name} value={item.name}>{item.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Quantity"
                          className="form-input"
                          style={{ width: "100px", padding: "8px", fontSize: "14px" }}
                          value={ingredient.quantity}
                          onChange={(e) => handleNewDishIngredientChange(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                        />
                        <select
                          className="form-select"
                          style={{ width: "80px", padding: "8px", fontSize: "14px" }}
                          value={ingredient.unit}
                          onChange={(e) => handleNewDishIngredientChange(index, "unit", e.target.value)}
                        >
                          {measurementUnits.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cost"
                          className="form-input"
                          style={{ width: "100px", padding: "8px", fontSize: "14px" }}
                          value={ingredient.cost}
                          disabled
                        />
                        <button
                          className="btn btn-danger"
                          style={{ padding: "8px" }}
                          onClick={() => {
                            const updatedIngredients = newDish.ingredients.filter((_, i) => i !== index)
                            setNewDish({ ...newDish, ingredients: updatedIngredients })
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn btn-secondary"
                      onClick={addIngredientToNewDish}
                    >
                      Add Ingredient
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveNewDish}
                  >
                    Save Dish
                  </button>
                </div>
              </div>
          </div>
        )}

        {showModal && selectedDish && (
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
            onClick={() => setShowModal(false)}
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
                <h2 style={{ margin: 0, color: "#2d5a27" }}>{editMode ? "Edit Dish" : "View Dish"}</h2>
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "30px",
                }}
              >
                <div className="form-group">
                  <label className="form-label">Dish Name</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.name}
                    onChange={(e) => setSelectedDish({ ...selectedDish, name: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.category}
                    onChange={(e) => setSelectedDish({ ...selectedDish, category: e.target.value })}
                    disabled={!editMode}
                  >
                    {(() => {
                      const dbCategoryNames = categories.map(c => c.name);
                      const allCategories = [...dishCategories];
                      categories.forEach(c => {
                        if (!dishCategories.includes(c.name)) {
                          allCategories.push(c.name);
                        }
                      });
                      return allCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Servings</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.servings}
                    onChange={(e) => handleSelectedDishPriceChange("servings", Number.parseInt(e.target.value) || 0)}
                    disabled={!editMode}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Selling Price per Serving (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.pricePerServing}
                    onChange={(e) => handleSelectedDishPriceChange("pricePerServing", Number.parseFloat(e.target.value) || 0)}
                    disabled={!editMode}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recipe Cost (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.cost}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Selling Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.totalSellingPrice}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Profit (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.profit}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Profit per Serving (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                    value={selectedDish.profitPerServing}
                    disabled
                  />
                </div>
              </div>

              {editMode && (
                <div style={{ marginBottom: "30px" }}>
                  <h3 style={{ marginBottom: "15px", color: "#2d5a27" }}>Ingredients</h3>
                  {selectedDish.ingredients.map((ingredient, index) => (
                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
                      <select
                        className="form-select"
                        style={{ flex: 1, padding: "8px", fontSize: "14px" }}
                        value={ingredient.name}
                        onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                      >
                        <option value="">Select ingredient</option>
                        {inventoryItems.map((item) => (
                          <option key={item.name} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Quantity"
                        className="form-input"
                        style={{ width: "100px", padding: "8px", fontSize: "14px" }}
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                      />
                      <select
                        className="form-select"
                        style={{ width: "80px", padding: "8px", fontSize: "14px" }}
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                      >
                        {measurementUnits.map((unit) => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        className="form-input"
                        style={{ width: "100px", padding: "8px", fontSize: "14px" }}
                        value={ingredient.cost}
                        disabled
                      />
                      <button
                        className="btn btn-danger"
                        style={{ padding: "8px" }}
                        onClick={() => {
                          const updatedIngredients = selectedDish.ingredients.filter((_, i) => i !== index)
                          setSelectedDish({ ...selectedDish, ingredients: updatedIngredients })
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedDish({
                      ...selectedDish,
                      ingredients: [...selectedDish.ingredients, { name: "", quantity: 0, unit: "", cost: 0 }]
                    })}
                  >
                    Add Ingredient
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
                {editMode && (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveDish}
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  </AuthGuard>
)
}
