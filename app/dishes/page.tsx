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

const dishCategories = ["Main Course", "Rice", "Dessert", "Drinks", "Appetizer", "Side Dish"]

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

const inventoryItems = [
  { name: "Chicken Breast", unit: "kg", costPerUnit: 200, stock: 15.5 },
  { name: "Pork", unit: "kg", costPerUnit: 200, stock: 12.3 },
  { name: "Ground Pork", unit: "kg", costPerUnit: 120, stock: 8.7 },
  { name: "Soy Sauce", unit: "L", costPerUnit: 60, stock: 5.2 },
  { name: "Vinegar", unit: "L", costPerUnit: 40, stock: 3.8 },
  { name: "Garlic", unit: "kg", costPerUnit: 120, stock: 2.1 },
  { name: "Bay Leaf", unit: "kg", costPerUnit: 800, stock: 0.5 },
  { name: "Oil", unit: "L", costPerUnit: 100, stock: 4.5 },
  { name: "Tamarind Mix", unit: "kg", costPerUnit: 500, stock: 1.2 },
  { name: "Tomato", unit: "kg", costPerUnit: 60, stock: 8.3 },
  { name: "Onion", unit: "kg", costPerUnit: 80, stock: 6.7 },
  { name: "Kangkong", unit: "kg", costPerUnit: 50, stock: 3.2 },
  { name: "Radish", unit: "kg", costPerUnit: 65, stock: 4.1 },
  { name: "Spring Roll Wrapper", unit: "pcs", costPerUnit: 0.5, stock: 200 },
  { name: "Carrot", unit: "kg", costPerUnit: 50, stock: 5.5 },
  { name: "Mixed Beans", unit: "kg", costPerUnit: 160, stock: 2.8 },
  { name: "Ube Ice Cream", unit: "kg", costPerUnit: 300, stock: 1.5 },
  { name: "Leche Flan", unit: "kg", costPerUnit: 400, stock: 1.2 },
  { name: "Shaved Ice", unit: "kg", costPerUnit: 10, stock: 50 },
  { name: "Evaporated Milk", unit: "L", costPerUnit: 100, stock: 3.5 },
  { name: "Sugar", unit: "kg", costPerUnit: 150, stock: 10.2 },
]

const sampleDishes: Dish[] = [
  {
    id: 1,
    name: "Chicken Adobo",
    servings: 4,
    pricePerServing: 30,
    cost: 58,
    totalSellingPrice: 120,
    profit: 62,
    profitPerServing: 15.5, // (120 - 58) / 4
    category: "Main Course",
    status: "available",
    ingredients: [
      { name: "Chicken Breast", quantity: 0.25, unit: "kg", cost: 50 },
      { name: "Soy Sauce", quantity: 0.02, unit: "L", cost: 1.2 },
      { name: "Vinegar", quantity: 0.015, unit: "L", cost: 0.6 },
      { name: "Garlic", quantity: 0.01, unit: "kg", cost: 1.2 },
      { name: "Bay Leaf", quantity: 0.005, unit: "kg", cost: 4 },
      { name: "Oil", quantity: 0.01, unit: "L", cost: 1 },
    ],
  },
  {
    id: 2,
    name: "Chicken Adobo Large",
    servings: 6,
    pricePerServing: 28,
    cost: 87,
    totalSellingPrice: 168,
    profit: 81,
    profitPerServing: 13.5, // (168 - 87) / 6
    category: "Main Course",
    status: "available",
    ingredients: [
      { name: "Chicken Breast", quantity: 0.375, unit: "kg", cost: 75 },
      { name: "Soy Sauce", quantity: 0.03, unit: "L", cost: 1.8 },
      { name: "Vinegar", quantity: 0.0225, unit: "L", cost: 0.9 },
      { name: "Garlic", quantity: 0.015, unit: "kg", cost: 1.8 },
      { name: "Bay Leaf", quantity: 0.0075, unit: "kg", cost: 6 },
      { name: "Oil", quantity: 0.015, unit: "L", cost: 1.5 },
    ],
  },
  {
    id: 3,
    name: "Pork Sinigang",
    servings: 5,
    pricePerServing: 26,
    cost: 65,
    totalSellingPrice: 130,
    profit: 65,
    profitPerServing: 13, // (130 - 65) / 5
    category: "Main Course",
    status: "available",
    ingredients: [
      { name: "Pork", quantity: 0.2, unit: "kg", cost: 40 },
      { name: "Tamarind Mix", quantity: 0.03, unit: "kg", cost: 15 },
      { name: "Tomato", quantity: 0.05, unit: "kg", cost: 3 },
      { name: "Onion", quantity: 0.03, unit: "kg", cost: 2 },
      { name: "Kangkong", quantity: 0.05, unit: "kg", cost: 2.5 },
      { name: "Radish", quantity: 0.04, unit: "kg", cost: 2.5 },
    ],
  },
  {
    id: 4,
    name: "Lumpiang Shanghai",
    servings: 10,
    pricePerServing: 5,
    cost: 20,
    totalSellingPrice: 50,
    profit: 30,
    profitPerServing: 3, // (50 - 20) / 10
    category: "Appetizer",
    status: "available",
    ingredients: [
      { name: "Ground Pork", quantity: 0.1, unit: "kg", cost: 12 },
      { name: "Spring Roll Wrapper", quantity: 10, unit: "pcs", cost: 5 },
      { name: "Carrot", quantity: 0.02, unit: "kg", cost: 1 },
      { name: "Onion", quantity: 0.01, unit: "kg", cost: 0.5 },
      { name: "Oil", quantity: 0.02, unit: "L", cost: 1.5 },
    ],
  },
  {
    id: 5,
    name: "Halo-Halo",
    servings: 1,
    pricePerServing: 95,
    cost: 45,
    totalSellingPrice: 95,
    profit: 50,
    profitPerServing: 50, // (95 - 45) / 1
    category: "Dessert",
    status: "available",
    ingredients: [
      { name: "Mixed Beans", quantity: 0.05, unit: "kg", cost: 8 },
      { name: "Ube Ice Cream", quantity: 0.05, unit: "kg", cost: 15 },
      { name: "Leche Flan", quantity: 0.03, unit: "kg", cost: 12 },
      { name: "Shaved Ice", quantity: 0.2, unit: "kg", cost: 2 },
      { name: "Evaporated Milk", quantity: 0.05, unit: "L", cost: 5 },
      { name: "Sugar", quantity: 0.02, unit: "kg", cost: 3 },
    ],
  },
  {
    id: 6,
    name: "Fresh Buko Juice",
    servings: 1,
    pricePerServing: 45,
    cost: 15,
    totalSellingPrice: 45,
    profit: 30,
    profitPerServing: 30, // (45 - 15) / 1
    category: "Drinks",
    status: "available",
    ingredients: [{ name: "Sugar", quantity: 0.01, unit: "kg", cost: 1.5 }],
  },
  {
    id: 7,
    name: "Iced Tea",
    servings: 1,
    pricePerServing: 25,
    cost: 8,
    totalSellingPrice: 25,
    profit: 17,
    profitPerServing: 17, // (25 - 8) / 1
    category: "Drinks",
    status: "available",
    ingredients: [{ name: "Sugar", quantity: 0.005, unit: "kg", cost: 0.75 }],
  },
]

export default function DishesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
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
    category: "Main Course",
    status: "available",
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
    // Load categories and items
    Promise.all([
      fetch('/api/categories').then(r=>r.json()).catch(()=>[]),
      fetch('/api/items').then(r=>r.json()).catch(()=>[]),
    ]).then(([cats, items]) => {
      if (Array.isArray(items)) {
        setDishes(items.map((r:any)=>({
          id: r.id,
          name: r.name,
          servings: r.total_servings ?? 0,
          pricePerServing: Number(r.price??0),
          cost: 0,
          totalSellingPrice: Number(r.price??0),
          profit: 0,
          profitPerServing: 0,
          category: r.category || 'Uncategorized',
          status: r.available ? 'available' : 'hidden',
          ingredients: [],
        })))
      }
      if (Array.isArray(cats)) {
        setCategories(cats.filter((c:any)=>c && c.id && c.name))
      }
    })
  }, [router])

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
      ingredients: [...newDish.ingredients, { name: "", quantity: 0, unit: "kg", cost: 0 }],
    })
  }

  const handleNewDishIngredientChange = (index: number, field: string, value: string | number) => {
    const updatedIngredients = [...newDish.ingredients]
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value }

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
      updatedDish.totalSellingPrice = calculateTotalSellingPrice(
        field === "servings" ? value : newDish.servings,
        field === "pricePerServing" ? value : newDish.pricePerServing,
      )
      updatedDish.profit = calculateProfit(updatedDish.totalSellingPrice, newDish.cost)
      updatedDish.profitPerServing = calculateProfitPerServing(
        updatedDish.totalSellingPrice,
        newDish.cost,
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

  const deleteDish = (dishId: number) => {
    if (confirm("Are you sure you want to delete this dish? This action cannot be undone.")) {
      setDishes(dishes.filter((dish) => dish.id !== dishId))
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
    const errors: string[] = []
    if (!newDish.name.trim()) errors.push('Dish name is required')
    if (!selectedCat) errors.push('Please select a valid category')
    if (newDish.servings <= 0) errors.push('Servings must be greater than 0')
    if (newDish.pricePerServing < 0) errors.push('Price per serving must be 0 or more')
    if (newDish.ingredients.length === 0) errors.push('Add at least one ingredient')
    setFormError(errors.join('\n'))
    if (errors.length) return

    try {
      const cat = newDish.category || 'Uncategorized'
      // optional: ensure category exists (omitted for brevity)
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDish.name,
          price: newDish.pricePerServing,
          category_id: selectedCat?.id ?? null,
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
      category: "Main Course",
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
      const existingRows = await fetch(`/api/recipes?item_id=${selectedDish.id}`).then(r=>r.json()).catch(()=>[])
      const ingAll = await fetch('/api/ingredients').then(r=>r.json()).catch(()=>[])
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
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <div className="main-layout">
        <Sidebar user={user} currentPage="/dishes" />

        <main className="main-content">
          <div className="top-bar">
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#2d5a27" }}>Dishes & Recipes</h1>
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
                    <label className="form-label">Dish Name</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.name}
                      onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                      placeholder="Enter dish name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.category}
                      onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                    >
                      {categories.length === 0 && dishCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Servings</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.servings}
                      onChange={(e) => handleNewDishPriceChange("servings", Number.parseInt(e.target.value) || 1)}
                      placeholder="e.g., 4"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price per Serving (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDish.pricePerServing}
                      onChange={(e) =>
                        handleNewDishPriceChange("pricePerServing", Number.parseFloat(e.target.value) || 0)
                      }
                      placeholder="Enter price per serving"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Image URL (optional)</label>
                    <input
                      type="url"
                      className="form-input"
                      style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                      value={newDishImageUrl}
                      onChange={(e) => setNewDishImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Image (mobile-friendly)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          try {
                            setUploading(true)
                            const fd = new FormData()
                            fd.append('file', f)
                            const res = await fetch('/api/upload', { method: 'POST', body: fd })
                            const data = await res.json()
                            if (res.ok && data?.url) {
                              setNewDishImageUrl(data.url)
                              setFormError("")
                            } else {
                              setFormError(data?.error || 'Upload failed')
                            }
                          } catch (err) {
                            setFormError('Upload failed')
                          } finally {
                            setUploading(false)
                          }
                        }}
                      />
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={uploading}
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.onchange = (ev: any) => {
                            const f = ev.target.files?.[0]
                            if (!f) return
                            const dt = new DataTransfer()
                            dt.items.add(f)
                            ;(document.querySelector('input[type=file][accept^="image/"]') as HTMLInputElement)?.dispatchEvent(new Event('change'))
                          }
                          input.click()
                        }}
                      >
                        {uploading ? 'Uploading...' : 'Choose Image'}
                      </button>
                      {newDishImageUrl && (
                        <img src={newDishImageUrl} alt="preview" style={{ height: 48, borderRadius: 6, border: '1px solid #e9ecef' }} />
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Selling Price (₱)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        background: "#f8f9fa",
                        color: "#6c757d",
                      }}
                      value={newDish.totalSellingPrice.toFixed(2)}
                      disabled
                    />
                    <small style={{ color: "#6c757d", fontSize: "12px", display: "block", marginTop: "4px" }}>
                      Auto-calculated: {newDish.servings} × ₱{newDish.pricePerServing.toFixed(2)}
                    </small>
                  </div>
                </div>

                {newDish.ingredients.length > 0 && (
                  <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                    <table className="table" style={{ minWidth: "700px" }}>
                      <thead>
                        <tr>
                          <th style={{ minWidth: "150px" }}>Ingredient</th>
                          <th style={{ minWidth: "100px" }}>Quantity</th>
                          <th style={{ minWidth: "80px" }}>Unit</th>
                          <th style={{ minWidth: "120px" }}>Cost (₱)</th>
                          <th style={{ minWidth: "80px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newDish.ingredients.map((ingredient, index) => {
                          const inventoryItem = inventoryItems.find((item) => item.name === ingredient.name)
                          const showConversion =
                            inventoryItem && ingredient.unit !== inventoryItem.unit && ingredient.quantity > 0
                          const convertedQty = showConversion
                            ? convertUnits(ingredient.quantity, ingredient.unit, inventoryItem.unit)
                            : 0

                          return (
                            <tr key={index}>
                              <td>
                                <select
                                  className="form-select"
                                  style={{ width: "100%", padding: "8px", fontSize: "14px" }}
                                  value={ingredient.name}
                                  onChange={(e) => handleNewDishIngredientChange(index, "name", e.target.value)}
                                >
                                  <option value="">Select ingredient...</option>
                                  {inventoryItems.map((item) => (
                                    <option key={item.name} value={item.name}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.001"
                                  className="form-input"
                                  style={{ width: "100%", padding: "8px", fontSize: "14px" }}
                                  value={ingredient.quantity}
                                  onChange={(e) =>
                                    handleNewDishIngredientChange(
                                      index,
                                      "quantity",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  placeholder="0.000"
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select"
                                  style={{ width: "100%", padding: "8px", fontSize: "14px" }}
                                  value={ingredient.unit}
                                  onChange={(e) => handleNewDishIngredientChange(index, "unit", e.target.value)}
                                >
                                  {measurementUnits.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <div style={{ fontWeight: "600" }}>₱{ingredient.cost.toFixed(2)}</div>
                                {showConversion && (
                                  <small style={{ color: "#6c757d", fontSize: "11px", display: "block" }}>
                                    ≈ {convertedQty.toFixed(3)} {inventoryItem.unit}
                                    <br />@ ₱{inventoryItem.costPerUnit}/{inventoryItem.unit}
                                  </small>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: "6px 10px", fontSize: "12px", width: "100%" }}
                                  onClick={() => {
                                    const updatedIngredients = newDish.ingredients.filter((_, i) => i !== index)
                                    const totalCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
                                    setNewDish({
                                      ...newDish,
                                      ingredients: updatedIngredients,
                                      cost: totalCost,
                                      profit: newDish.totalSellingPrice - totalCost,
                                    })
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#f8f9fa", fontWeight: "600" }}>
                          <td colSpan={3}>Total Cost</td>
                          <td>₱{newDish.cost.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <button className="btn btn-secondary" style={{ marginBottom: "20px" }} onClick={addIngredientToNewDish}>
                  + Add Ingredient
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "15px",
                    marginTop: "20px",
                    padding: "20px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                  }}
                >
                  <div>
                    <strong>Recipe Cost:</strong>
                    <br />₱{newDish.cost.toFixed(2)}
                  </div>
                  <div>
                    <strong>Total Selling Price:</strong>
                    <br />₱{newDish.totalSellingPrice.toFixed(2)}
                  </div>
                  <div style={{ color: newDish.profit >= 0 ? "#28a745" : "#dc3545" }}>
                    <strong>Profit:</strong>
                    <br />₱{newDish.profit.toFixed(2)}
                  </div>
                  <div style={{ color: newDish.profit >= 0 ? "#28a745" : "#dc3545" }}>
                    <strong>Profit/Serving:</strong>
                    <br />₱{newDish.profitPerServing.toFixed(2)}
                  </div>
                  <div style={{ color: newDish.profit >= 0 ? "#28a745" : "#dc3545" }}>
                    <strong>Margin:</strong>
                    <br />
                    {newDish.totalSellingPrice > 0
                      ? ((newDish.profit / newDish.totalSellingPrice) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "30px",
                    display: "flex",
                    flexDirection: "row",
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
              }}
              onClick={() => setShowModal(false)}
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
                  <h2 style={{ margin: 0, color: "#2d5a27" }}>
                    {editMode ? "Edit" : "View"} Recipe: {selectedDish.name} ({selectedDish.servings} servings)
                  </h2>
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

                {editMode && (
                  <div className="grid grid-4 mb-20">
                    <div className="form-group">
                      <label className="form-label">Dish Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={selectedDish.name}
                        onChange={(e) => setSelectedDish({ ...selectedDish, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Number of Servings</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={selectedDish.servings}
                        onChange={(e) =>
                          handleSelectedDishPriceChange("servings", Number.parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Selling Price per Serving (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={selectedDish.pricePerServing}
                        onChange={(e) =>
                          handleSelectedDishPriceChange("pricePerServing", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Selling Price (₱)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selectedDish.totalSellingPrice.toFixed(2)}
                        disabled
                        style={{ background: "#f8f9fa", color: "#6c757d" }}
                      />
                      <small style={{ color: "#6c757d", fontSize: "12px" }}>
                        Auto-calculated: {selectedDish.servings} × ₱{selectedDish.pricePerServing.toFixed(2)}
                      </small>
                    </div>
                  </div>
                )}

                <h3 style={{ color: "#2d5a27", marginBottom: "15px" }}>Ingredients & Costing</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Cost (₱)</th>
                      {editMode && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDish.ingredients.map((ingredient, index) => (
                      <tr key={index}>
                        <td>
                          {editMode ? (
                            <input
                              type="text"
                              className="form-input"
                              value={ingredient.name}
                              onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                            />
                          ) : (
                            ingredient.name
                          )}
                        </td>
                        <td>
                          {editMode ? (
                            <input
                              type="number"
                              step="0.001"
                              className="form-input"
                              value={ingredient.quantity}
                              onChange={(e) =>
                                handleIngredientChange(index, "quantity", Number.parseFloat(e.target.value) || 0)
                              }
                            />
                          ) : (
                            ingredient.quantity
                          )}
                        </td>
                        <td>
                          {editMode ? (
                            <input
                              type="text"
                              className="form-input"
                              value={ingredient.unit}
                              onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                            />
                          ) : (
                            ingredient.unit
                          )}
                        </td>
                        <td>
                          {editMode ? (
                            <input
                              type="number"
                              step="0.01"
                              className="form-input"
                              value={ingredient.cost}
                              onChange={(e) =>
                                handleIngredientChange(index, "cost", Number.parseFloat(e.target.value) || 0)
                              }
                            />
                          ) : (
                            `₱${ingredient.cost.toFixed(2)}`
                          )}
                        </td>
                        {editMode && (
                          <td>
                            <button
                              className="btn btn-danger"
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => {
                                const updatedIngredients = selectedDish.ingredients.filter((_, i) => i !== index)
                                const totalCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
                                setSelectedDish({
                                  ...selectedDish,
                                  ingredients: updatedIngredients,
                                  cost: totalCost,
                                  profit: selectedDish.pricePerServing - totalCost,
                                })
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8f9fa", fontWeight: "600" }}>
                      <td colSpan={editMode ? 3 : 3}>Total Cost</td>
                      <td>₱{selectedDish.cost.toFixed(2)}</td>
                      {editMode && <td></td>}
                    </tr>
                  </tfoot>
                </table>

                <div
                  className="grid grid-4"
                  style={{ marginTop: "20px", padding: "20px", background: "#f8f9fa", borderRadius: "6px" }}
                >
                  <div>
                    <strong>Recipe Cost:</strong> ₱{selectedDish.cost.toFixed(2)}
                  </div>
                  <div>
                    <strong>Total Selling Price:</strong> ₱{selectedDish.totalSellingPrice.toFixed(2)}
                  </div>
                  <div style={{ color: "#28a745" }}>
                    <strong>Profit:</strong> ₱{selectedDish.profit.toFixed(2)}
                  </div>
                  <div style={{ color: "#28a745" }}>
                    <strong>Profit/Serving:</strong> ₱{selectedDish.profitPerServing.toFixed(2)}
                  </div>
                  <div style={{ color: "#28a745" }}>
                    <strong>Margin:</strong>{" "}
                    {selectedDish.totalSellingPrice > 0
                      ? ((selectedDish.profit / selectedDish.totalSellingPrice) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  {editMode && (
                    <button className="btn btn-primary" onClick={handleSaveDish}>
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
