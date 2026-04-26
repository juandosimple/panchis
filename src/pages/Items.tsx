import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api"
import "../styles/Items.css"

interface Item {
  id: number
  nombre: string
  precio: number
  descripcion: string
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    nombre: "",
    precio: "",
    descripcion: "",
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await invoke<Item[]>("get_items")
      setItems(result)
    } catch (err) {
      setError(`Error loading items: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (editingId) {
        await invoke("update_item", {
          id: editingId,
          request: {
            ...formData,
            precio: parseFloat(formData.precio),
          },
        })
      } else {
        await invoke("create_item", {
          request: {
            ...formData,
            precio: parseFloat(formData.precio),
          },
        })
      }

      setFormData({
        nombre: "",
        precio: "",
        descripcion: "",
      })
      setEditingId(null)
      setShowForm(false)
      await loadItems()
    } catch (err) {
      setError(`Error saving item: ${err}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este item?")) return

    try {
      await invoke("delete_item", { id })
      await loadItems()
    } catch (err) {
      setError(`Error deleting item: ${err}`)
    }
  }

  const handleEdit = (item: Item) => {
    setFormData({
      nombre: item.nombre,
      precio: item.precio.toString(),
      descripcion: item.descripcion,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  if (loading && items.length === 0) {
    return <div className="loading">Cargando items...</div>
  }

  return (
    <div className="items-container">
      <div className="items-header">
        <h2>🍴 Items/Productos</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) setEditingId(null)
          }}
          className="btn-primary"
        >
          {showForm ? "Cancelar" : "+ Nuevo Item"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="item-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">Nombre del Item</label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ejemplo: Pancho con queso"
                required
              />
            </div>
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
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <input
              id="descripcion"
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del item"
            />
          </div>

          <button type="submit" className="btn-submit">
            {editingId ? "Actualizar Item" : "Crear Item"}
          </button>
        </form>
      )}

      <div className="items-list">
        {items.length === 0 ? (
          <p className="no-data">No hay items. ¡Agrega tu primer item!</p>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="nombre-cell">{item.nombre}</td>
                  <td className="precio-cell">${item.precio.toFixed(2)}</td>
                  <td className="desc-cell">{item.descripcion}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn-small btn-edit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
