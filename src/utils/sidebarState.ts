import { reactive } from 'vue'

/**
 * Single source of truth for sidebar open/close state.
 * Previously content.ts kept its own `isOpen` boolean while Sidebar.vue kept
 * a separate ref, and the two were only synced one-way (via manual
 * classList.toggle). That caused the sidebar to require two clicks to
 * reopen after being closed from the in-panel "X" button.
 *
 * Both content.ts and Sidebar.vue now import this same reactive object,
 * so there is exactly one state and both read/write it directly.
 */
export const sidebarState = reactive({
  isOpen: false
})

export function openSidebar(): void {
  sidebarState.isOpen = true
}

export function closeSidebar(): void {
  sidebarState.isOpen = false
}

export function toggleSidebarState(): void {
  sidebarState.isOpen = !sidebarState.isOpen
}
