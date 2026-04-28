import { create } from "zustand"
import { Page, OrdersView } from "../types"

interface UIState {
  currentPage: Page
  sidebarCollapsed: boolean
  ordersView: OrdersView
  categoriasActivas: string
  showOrdersModal: boolean
  setCurrentPage: (page: Page) => void
  toggleSidebar: () => void
  setOrdersView: (view: OrdersView) => void
  setCategoriasActivas: (cat: string) => void
  setShowOrdersModal: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: "dashboard",
  sidebarCollapsed: false,
  ordersView: "pos",
  categoriasActivas: "Todos",
  showOrdersModal: false,
  setCurrentPage: (currentPage) => set({ currentPage }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setOrdersView: (ordersView) => set({ ordersView }),
  setCategoriasActivas: (categoriasActivas) => set({ categoriasActivas }),
  setShowOrdersModal: (showOrdersModal) => set({ showOrdersModal }),
}))
