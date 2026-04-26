import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api"
import "../styles/Clientes.css"

interface Cliente {
  id: number
  nombre: string
  telefono: string
  direccion: string
  zona: string
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    zona: "",
  })

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      setLoading(true)
      const result = await invoke<Cliente[]>("get_clientes")
      setClientes(result)
    } catch (err) {
      setError(`Error loading clientes: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (editingId) {
        await invoke("update_cliente", {
          id: editingId,
          request: formData,
        })
      } else {
        await invoke("create_cliente", {
          request: formData,
        })
      }

      setFormData({
        nombre: "",
        telefono: "",
        direccion: "",
        zona: "",
      })
      setEditingId(null)
      setShowForm(false)
      await loadClientes()
    } catch (err) {
      setError(`Error saving cliente: ${err}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return

    try {
      await invoke("delete_cliente", { id })
      await loadClientes()
    } catch (err) {
      setError(`Error deleting cliente: ${err}`)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      zona: cliente.zona,
    })
    setEditingId(cliente.id)
    setShowForm(true)
  }

  if (loading && clientes.length === 0) {
    return <div className="loading">Cargando clientes...</div>
  }

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h2>👥 Clientes</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) setEditingId(null)
          }}
          className="btn-primary"
        >
          {showForm ? "Cancelar" : "+ Nuevo Cliente"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="cliente-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del cliente"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <input
              id="direccion"
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Dirección completa"
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

          <button type="submit" className="btn-submit">
            {editingId ? "Actualizar Cliente" : "Crear Cliente"}
          </button>
        </form>
      )}

      <div className="clientes-list">
        {clientes.length === 0 ? (
          <p className="no-data">No hay clientes. ¡Agrega tu primer cliente!</p>
        ) : (
          <table className="clientes-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Zona</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="nombre-cell">{cliente.nombre}</td>
                  <td>{cliente.telefono}</td>
                  <td className="direccion-cell">{cliente.direccion}</td>
                  <td>{cliente.zona}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="btn-small btn-edit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
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
