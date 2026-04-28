export type Page = "dashboard" | "orders" | "clientes" | "items" | "reportes" | "stock" | "configuracion"
export type OrdersView = "pos" | "historial"
export type ReportTab = "diario" | "mensual" | "productos"

export interface Order {
  id: number
  cliente: string
  items: string
  precio: number
  fecha: string
  hora: string
  zona: string
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string
  direccion: string
  zona: string
}

export interface Item {
  id: number
  nombre: string
  precio: number
  descripcion: string
  categoria: string
}

export interface DailySales {
  fecha: string
  total: number
  cantidad: number
}

export interface ZoneSales {
  zona: string
  total: number
  cantidad: number
}

export interface ItemVendido {
  itemId: number
  cantidad: number
}

export interface CreateOrderInput {
  cliente: string
  items: string
  precio: number
  fecha: string
  hora: string
  zona: string
  itemsVendidos?: ItemVendido[]
}

export interface StockItem {
  id: number
  nombre: string
  cantidad: number
  unidad: string
}

export interface ItemIngrediente {
  stockItemId: number
  nombre: string
  cantidad: number
  unidad: string
}

export interface CreateItemInput {
  nombre: string
  precio: number
  descripcion: string
  categoria: string
}

export interface CreateClienteInput {
  nombre: string
  telefono: string
  direccion: string
  zona: string
}
