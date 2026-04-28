import { useEffect, useState } from "react"
import { Archive, Plus, X, Pencil, Trash2, Check, AlertTriangle } from "lucide-react"
import { StockItem } from "../types"
import { useStockStore } from "../stores/useStockStore"
import Button from "../components/Button"
import PageHeader from "../components/PageHeader"
import "../styles/Stock.css"

const UNIDADES = ["unidades", "kg", "gr", "lt", "ml", "paquetes", "cajas"]

interface StockFormData {
  nombre: string
  cantidad: number
  unidad: string
}

const EMPTY: StockFormData = { nombre: "", cantidad: 0, unidad: "unidades" }

function StockForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: StockFormData
  onSave: (data: StockFormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<StockFormData>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await onSave({ ...form, cantidad: Number(form.cantidad) })
    } catch (err) {
      setError(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stock-form">
      {error && <div className="error-message">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Porta pancho"
            required
          />
        </div>
        <div className="form-group form-group-sm">
          <label>Cantidad</label>
          <div className="qty-stepper qty-stepper-input">
            <button
              type="button"
              className="qty-stepper-btn"
              onClick={() => setForm((f) => ({ ...f, cantidad: Math.max(0, f.cantidad - 1) }))}
              disabled={form.cantidad <= 0}
            >−</button>
            <input
              type="text"
              inputMode="numeric"
              className="qty-stepper-field"
              value={form.cantidad === 0 ? "" : String(form.cantidad)}
              onKeyDown={(e) => {
                if (!/^\d$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) {
                  e.preventDefault()
                }
              }}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "")
                setForm({ ...form, cantidad: digits === "" ? 0 : parseInt(digits) })
              }}
              placeholder="0"
              required
            />
            <button
              type="button"
              className="qty-stepper-btn"
              onClick={() => setForm((f) => ({ ...f, cantidad: f.cantidad + 1 }))}
            >+</button>
          </div>
        </div>
        <div className="form-group form-group-sm">
          <label>Unidad</label>
          <select
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
            className="stock-select"
          >
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <Button icon={Check} variant="success" type="submit" disabled={loading} size="sm">
          Guardar
        </Button>
        <Button icon={X} variant="secondary" type="button" onClick={onCancel} size="sm">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

const LOW_STOCK_THRESHOLD = 5

function stockStatus(cantidad: number) {
  if (cantidad <= 0) return "empty"
  if (cantidad <= LOW_STOCK_THRESHOLD) return "low"
  return "ok"
}

export default function Stock() {
  const { stockItems, loading, loadStock, createStockItem, updateStockItem, deleteStockItem } = useStockStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { loadStock() }, [])

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000) }
  }

  const handleCreate = async (data: StockFormData) => {
    await createStockItem(data)
    setShowForm(false)
    notify("✓ Item de stock creado")
  }

  const handleUpdate = async (data: StockFormData) => {
    if (!editing) return
    await updateStockItem(editing.id, data)
    setEditing(null)
    notify("✓ Item actualizado")
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este item de stock?")) return
    try {
      await deleteStockItem(id)
    } catch (err) {
      notify(`Error: ${err}`, true)
    }
  }

  const lowCount = stockItems.filter((s) => stockStatus(s.cantidad) !== "ok").length

  if (loading && stockItems.length === 0) return <div className="loading">Cargando stock...</div>

  return (
    <div className="stock-container">
      <PageHeader
        icon={<Archive size={28} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />}
        title="Stock"
        action={
          <Button
            icon={showForm ? X : Plus}
            variant={showForm ? "secondary" : "success"}
            size="sm"
            onClick={() => { setShowForm(!showForm); setEditing(null) }}
          >
            {showForm ? "Cancelar" : "Nuevo Item"}
          </Button>
        }
      />

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {lowCount > 0 && (
        <div className="stock-alert">
          <AlertTriangle size={16} />
          {lowCount} {lowCount === 1 ? "item tiene" : "items tienen"} stock bajo o agotado
        </div>
      )}

      {showForm && (
        <div className="stock-form-wrapper">
          <StockForm
            initial={EMPTY}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="stock-list">
        {stockItems.length === 0 ? (
          <p className="no-data">No hay items de stock. ¡Agrega tu primer ingrediente!</p>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item) => (
                <>
                  <tr key={item.id} className={editing?.id === item.id ? "editing-row" : ""}>
                    <td className="nombre-cell">{item.nombre}</td>
                    <td className={`cantidad-cell status-${stockStatus(item.cantidad)}`}>
                      {item.cantidad % 1 === 0 ? item.cantidad : item.cantidad.toFixed(2)}
                    </td>
                    <td>{item.unidad}</td>
                    <td>
                      <span className={`stock-badge stock-badge-${stockStatus(item.cantidad)}`}>
                        {stockStatus(item.cantidad) === "ok" ? "OK" : stockStatus(item.cantidad) === "low" ? "Bajo" : "Agotado"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-small btn-edit" onClick={() => setEditing(editing?.id === item.id ? null : item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-small btn-delete" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  {editing?.id === item.id && (
                    <tr key={`edit-${item.id}`} className="edit-form-row">
                      <td colSpan={5}>
                        <StockForm
                          initial={{ nombre: item.nombre, cantidad: item.cantidad, unidad: item.unidad }}
                          onSave={handleUpdate}
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
