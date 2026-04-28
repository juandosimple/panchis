import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { Item, CreateItemInput } from "../types"

interface ItemsState {
  items: Item[]
  loading: boolean
  loadItems: () => Promise<void>
  createItem: (data: CreateItemInput) => Promise<number>
  updateItem: (id: number, data: CreateItemInput) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  getCategorias: () => string[]
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  loading: false,

  loadItems: async () => {
    set({ loading: true })
    try {
      const items = await invoke<Item[]>("get_items")
      set({ items })
    } finally {
      set({ loading: false })
    }
  },

  createItem: async (data) => {
    const id = await invoke<number>("create_item", { request: data })
    const items = await invoke<Item[]>("get_items")
    set({ items })
    return id
  },

  updateItem: async (id, data) => {
    await invoke("update_item", { id, request: data })
    const items = await invoke<Item[]>("get_items")
    set({ items })
  },

  deleteItem: async (id) => {
    await invoke("delete_item", { id })
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  getCategorias: () => {
    const cats = new Set(get().items.map((i) => i.categoria))
    return ["Todos", ...Array.from(cats).sort()]
  },
}))
