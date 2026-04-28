import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { StockItem, ItemIngrediente } from "../types"

interface StockState {
  stockItems: StockItem[]
  loading: boolean
  loadStock: () => Promise<void>
  createStockItem: (data: { nombre: string; cantidad: number; unidad: string }) => Promise<void>
  updateStockItem: (id: number, data: { nombre: string; cantidad: number; unidad: string }) => Promise<void>
  deleteStockItem: (id: number) => Promise<void>
  getItemIngredientes: (itemId: number) => Promise<ItemIngrediente[]>
  setItemIngredientes: (itemId: number, ingredientes: Array<{ stockItemId: number; cantidad: number }>) => Promise<void>
}

export const useStockStore = create<StockState>((set) => ({
  stockItems: [],
  loading: false,

  loadStock: async () => {
    set({ loading: true })
    try {
      const stockItems = await invoke<StockItem[]>("get_stock_items")
      set({ stockItems })
    } finally {
      set({ loading: false })
    }
  },

  createStockItem: async (data) => {
    await invoke("create_stock_item", { request: data })
    const stockItems = await invoke<StockItem[]>("get_stock_items")
    set({ stockItems })
  },

  updateStockItem: async (id, data) => {
    await invoke("update_stock_item", { id, request: data })
    const stockItems = await invoke<StockItem[]>("get_stock_items")
    set({ stockItems })
  },

  deleteStockItem: async (id) => {
    await invoke("delete_stock_item", { id })
    set((s) => ({ stockItems: s.stockItems.filter((i) => i.id !== id) }))
  },

  getItemIngredientes: (itemId) =>
    invoke<ItemIngrediente[]>("get_item_ingredientes", { itemId }),

  setItemIngredientes: (itemId, ingredientes) =>
    invoke("set_item_ingredientes", { itemId, ingredientes }),
}))
