"use client"
import { useEffect } from "react"

export default function SidebarSync() {
	// read and apply the sidebar state from localStorage (or fallback)
	useEffect(() => {
		const root = document.documentElement
		const body = document.body

		function applyState(collapsed: boolean) {
			// Update CSS custom properties
			root.style.setProperty("--sidebar-current", collapsed ? "60px" : "240px")
			root.style.setProperty("--hamburger-left", collapsed ? "calc(60px - 8px)" : "calc(240px - 8px)")
			
			// Toggle body classes for CSS selectors
			body.classList.toggle("sidebar-collapsed", collapsed)
			body.classList.toggle("fp-sidebar-collapsed", collapsed)
		}

		function readAndApply() {
			try {
				const raw = localStorage.getItem("sidebarCollapsed")
				const collapsed = raw ? JSON.parse(raw) : false
				applyState(Boolean(collapsed))
			} catch {
				applyState(false)
			}
		}

		// Listen to storage events (other browser tabs)
		function onStorage(e: StorageEvent) {
			if (e.key === "sidebarCollapsed") readAndApply()
		}

		// Listen to custom in-tab events (immediate sync across client-side route changes)
		function onCustom(e: Event) {
			const ev = e as CustomEvent<{ collapsed: boolean }>
			if (typeof ev.detail === "object" && typeof ev.detail.collapsed === "boolean") {
				applyState(ev.detail.collapsed)
			}
		}

		readAndApply()
		window.addEventListener("storage", onStorage)
		window.addEventListener("sidebar:toggled", onCustom as EventListener)

		return () => {
			window.removeEventListener("storage", onStorage)
			window.removeEventListener("sidebar:toggled", onCustom as EventListener)
		}
	}, [])

	return null
}
