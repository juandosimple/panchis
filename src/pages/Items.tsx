import { useEffect, useState } from "react"
import { Package, Plus, X, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Item } from "../types"
import { useItemsStore } from "../stores/useItemsStore"
import Button from "../components/Button"
import ItemForm from "../components/ItemForm"
import PageHeader from "../components/PageHeader"
import "../styles/Items.css"

const PAGE_SIZE = 15

export default function Items() {
  const { items, loading, deleteItem } = useItemsStore()
  const loadItems = useItemsStore((s) => s.loadItems)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => { loadItems() }, [])

  const handleEdit = (item: Item) => {
    setEditing(item)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este item?")) return
    try {
      await deleteItem(id)
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  const handleFormDone = () => {
    setSuccess(editing ? "✓ Item actualizado" : "✓ Item creado")
    setTimeout(() => setSuccess(""), 3000)
    setShowForm(false)
    setEditing(null)
  }

  if (loading && items.length === 0) return <div className="loading">Cargando items...</div>

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="items-container">
      <PageHeader
        icon={<Package size={28} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />}
        title="Items/Productos"
        action={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "success"}
            size="sm"
            onClick={() => { setShowForm(!showForm); if (showForm) setEditing(null) }}
          >
            {showForm ? "Cancelar" : "Nuevo Item"}
          </Button>
        }
      />

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <ItemForm
          editing={editing}
          onDone={handleFormDone}
        />
      )}

      <div className="items-list">
        {items.length === 0 ? (
          <p className="no-data">No hay items. ¡Agrega tu primer item!</p>
        ) : (
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Precio</th><th>Categoría</th><th>Descripción</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.id}>
                    <td className="nombre-cell">{item.nombre}</td>
                    <td className="precio-cell">${item.precio.toFixed(2)}</td>
                    <td className="categoria-cell">{item.categoria}</td>
                    <td className="desc-cell">{item.descripcion}</td>
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(item)} className="btn-small btn-edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} className="btn-small btn-delete"><Trash2 size={14} /></button>
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
