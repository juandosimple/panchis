import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import "../styles/Orders.css"

interface Order {
  id: number
  cliente: string
  items: string
  precio: number
  fecha: string
  hora: string
  zona: string
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const [formData, setFormData] = useState({
    cliente: "",
    items: "",
    precio: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: new Date().toTimeString().split(" ")[0],
    zona: "",
  })

  const [filters, setFilters] = useState({
    search: "",
    fecha_from: "",
    fecha_to: "",
    zona: "",
  })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      let result: Order[]

      // Si hay filtros activos, usar búsqueda
      if (filters.search || filters.fecha_from || filters.fecha_to || filters.zona) {
        result = await invoke<Order[]>("search_orders", {
          request: {
            search: filters.search || null,
            fecha_from: filters.fecha_from || null,
            fecha_to: filters.fecha_to || null,
            zona: filters.zona || null,
          },
        })
      } else {
        result = await invoke<Order[]>("get_orders")
      }

      setOrders(result)
    } catch (err) {
      setError(`Error loading orders: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = async () => {
    await loadOrders()
  }

  const resetFilters = async () => {
    setFilters({
      search: "",
      fecha_from: "",
      fecha_to: "",
      zona: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (editingId) {
        await invoke("update_order", {
          id: editingId,
          request: {
            ...formData,
            precio: parseFloat(formData.precio),
          },
        })
      } else {
        await invoke("create_order", {
          request: {
            ...formData,
            precio: parseFloat(formData.precio),
          },
        })
      }

      setFormData({
        cliente: "",
        items: "",
        precio: "",
        fecha: new Date().toISOString().split("T")[0],
        hora: new Date().toTimeString().split(" ")[0],
        zona: "",
      })
      setEditingId(null)
      setShowForm(false)
      await loadOrders()
    } catch (err) {
      setError(`Error saving order: ${err}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta orden?")) return

    try {
      await invoke("delete_order", { id })
      await loadOrders()
    } catch (err) {
      setError(`Error deleting order: ${err}`)
    }
  }

  const handleEdit = (order: Order) => {
    setFormData({
      cliente: order.cliente,
      items: order.items,
      precio: order.precio.toString(),
      fecha: order.fecha,
      hora: order.hora,
      zona: order.zona,
    })
    setEditingId(order.id)
    setShowForm(true)
  }

  if (loading && orders.length === 0) {
    return <div className="loading">Cargando órdenes...</div>
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2>📋 Órdenes</h2>
        <div className="header-buttons">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            🔍 {showFilters ? "Ocultar" : "Mostrar"} Filtros
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm)
              if (showForm) setEditingId(null)
            }}
            className="btn-primary"
          >
            {showForm ? "Cancelar" : "+ Nueva Orden"}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="search">Buscar por cliente o items</label>
              <input
                id="search"
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Cliente, items..."
              />
            </div>
            <div className="filter-group">
              <label htmlFor="fecha_from">Desde</label>
              <input
                id="fecha_from"
                type="date"
                value={filters.fecha_from}
                onChange={(e) => setFilters({ ...filters, fecha_from: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="fecha_to">Hasta</label>
              <input
                id="fecha_to"
                type="date"
                value={filters.fecha_to}
                onChange={(e) => setFilters({ ...filters, fecha_to: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="zona">Zona</label>
              <input
                id="zona"
                type="text"
                value={filters.zona}
                onChange={(e) => setFilters({ ...filters, zona: e.target.value })}
                placeholder="Zona"
              />
            </div>
          </div>
          <div className="filter-actions">
            <button onClick={handleFilterChange} className="btn-filter">
              Aplicar Filtros
            </button>
            <button onClick={resetFilters} className="btn-reset">
              Limpiar
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cliente">Cliente</label>
              <input
                id="cliente"
                type="text"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="zona">Zona</label>
              <input
                id="zona"
                type="text"
                value={formData.zona}
                onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                placeholder="Zona de entrega"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="items">Items</label>
            <textarea
              id="items"
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: e.target.value })}
              placeholder="Ejemplo: 2x Pancho con queso, 1x Refresco"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="precio">Precio</label>
              <input
                id="precio"
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="fecha">Fecha</label>
              <input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="hora">Hora</label>
              <input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-submit">
            {editingId ? "Actualizar Orden" : "Crear Orden"}
          </button>
        </form>
      )}

      <div className="orders-list">
        {orders.length === 0 ? (
          <p className="no-data">No hay órdenes. ¡Crea tu primera orden!</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Items</th>
                <th>Precio</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Zona</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.cliente}</td>
                  <td className="items-cell">{order.items}</td>
                  <td className="precio-cell">${order.precio.toFixed(2)}</td>
                  <td>{order.fecha}</td>
                  <td>{order.hora}</td>
                  <td>{order.zona}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(order)}
                      className="btn-small btn-edit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="btn-small btn-delete"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
