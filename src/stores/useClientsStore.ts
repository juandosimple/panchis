import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { Cliente, CreateClienteInput } from "../types"

interface ClientsState {
  clientes: Cliente[]
  loading: boolean
  loadClientes: () => Promise<void>
  createCliente: (data: CreateClienteInput) => Promise<void>
  updateCliente: (id: number, data: CreateClienteInput) => Promise<void>
  deleteCliente: (id: number) => Promise<void>
}

export const useClientsStore = create<ClientsState>((set) => ({
  clientes: [],
  loading: false,

  loadClientes: async () => {
    set({ loading: true })
    try {
      const clientes = await invoke<Cliente[]>("get_clientes")
      set({ clientes })
    } finally {
      set({ loading: false })
    }
  },

  createCliente: async (data) => {
    await invoke("create_cliente", { request: data })
    const clientes = await invoke<Cliente[]>("get_clientes")
    set({ clientes })
  },

  updateCliente: async (id, data) => {
    await invoke("update_cliente", { id, request: data })
    const clientes = await invoke<Cliente[]>("get_clientes")
    set({ clientes })
  },

  deleteCliente: async (id) => {
    await invoke("delete_cliente", { id })
    set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) }))
  },
}))
