import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { Order, CreateOrderInput } from "../types"

interface OrdersState {
  orders: Order[]
  sentOrderIds: Set<number>
  loading: boolean
  loadOrders: () => Promise<void>
  createOrder: (data: CreateOrderInput) => Promise<void>
  deleteOrder: (id: number) => Promise<void>
  markAsSent: (id: number) => void
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  sentOrderIds: new Set(),
  loading: false,

  loadOrders: async () => {
    set({ loading: true })
    try {
      const orders = await invoke<Order[]>("get_orders")
      set({ orders })
    } finally {
      set({ loading: false })
    }
  },

  createOrder: async (data) => {
    await invoke("create_order", { request: data })
    const orders = await invoke<Order[]>("get_orders")
    set({ orders })
  },

  deleteOrder: async (id) => {
    await invoke("delete_order", { id })
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
  },

  markAsSent: (id) =>
    set((s) => ({ sentOrderIds: new Set([...s.sentOrderIds, id]) })),
}))
