import { useEffect, useState } from "react"
import { Users, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Cliente } from "../types"
import { useClientsStore } from "../stores/useClientsStore"
import Button from "../components/Button"
import ClienteForm from "../components/ClienteForm"
import PageHeader from "../components/PageHeader"
import "../styles/Clientes.css"

const PAGE_SIZE = 15

export default function Clientes() {
  const { clientes, loading, deleteCliente } = useClientsStore()
  const loadClientes = useClientsStore((s) => s.loadClientes)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => { loadClientes() }, [])

  const handleEdit = (cliente: Cliente) => {
    setEditing(cliente)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return
    try {
      await deleteCliente(id)
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  if (loading && clientes.length === 0) return <div className="loading">Cargando clientes...</div>

  const totalPages = Math.ceil(clientes.length / PAGE_SIZE)
  const paginated = clientes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="clientes-container">
      <PageHeader
        icon={<Users size={28} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />}
        title="Clientes"
        action={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "success"}
            size="sm"
            onClick={() => { setShowForm(!showForm); if (showForm) setEditing(null) }}
          >
            {showForm ? "Cancelar" : "Nuevo Cliente"}
          </Button>
        }
      />

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <ClienteForm
          editing={editing}
          onDone={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <div className="clientes-list">
        {clientes.length === 0 ? (
          <p className="no-data">No hay clientes. ¡Agrega tu primer cliente!</p>
        ) : (
          <>
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Zona</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id}>
                    <td className="nombre-cell">{c.nombre}</td>
                    <td>{c.telefono}</td>
                    <td className="direccion-cell">{c.direccion}</td>
                    <td>{c.zona}</td>
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(c)} className="btn-small btn-edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="btn-small btn-delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </button>
                <span className="page-info">{page} / {totalPages}</span>
                <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
