"use client"
import { useEffect } from "react"

export default function SidebarSync() {
	// read and apply the sidebar state from localStorage (or fallback)
	useEffect(() => {
		const root = document.documentElement
		const body = document.body

		function applyState(collapsed: boolean) {
			// Update CSS custom properties for proper width collapse
			const expandedWidth = getComputedStyle(root).getPropertyValue('--sidebar-width').trim() || '240px';
			const collapsedWidth = getComputedStyle(root).getPropertyValue('--sidebar-collapsed-width').trim() || '60px';
			const currentWidth = collapsed ? collapsedWidth : expandedWidth;
			root.style.setProperty("--sidebar-current", currentWidth);
			root.style.setProperty("--hamburger-left", `calc(${currentWidth} - 8px)`);

			// Toggle body classes for text visibility
			body.classList.toggle("sidebar-collapsed", collapsed);
			body.classList.toggle("fp-sidebar-collapsed", collapsed);
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
			const ev = e as CustomEvent<{ collapsed: boolean, fromHover?: boolean }>
			if (typeof ev.detail === "object" && typeof ev.detail.collapsed === "boolean") {
				// Only apply layout changes for non-hover events (hamburger toggle), ignore hover to prevent main content shifts
				if (!ev.detail.fromHover) {
					applyState(ev.detail.collapsed)
				}
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
