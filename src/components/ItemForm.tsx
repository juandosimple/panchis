import { useState, useEffect } from "react"
import { Check, X } from "lucide-react"
import { Item, CreateItemInput, ItemIngrediente } from "../types"
import { useItemsStore } from "../stores/useItemsStore"
import { useStockStore } from "../stores/useStockStore"
import Button from "./Button"
import CustomSelect from "./CustomSelect"
import QuantityInput from "./QuantityInput"

interface ItemFormProps {
  editing: Item | null
  onDone: () => void
}

const EMPTY: CreateItemInput = { nombre: "", precio: 0, descripcion: "", categoria: "Panchis" }

export default function ItemForm({ editing, onDone }: ItemFormProps) {
  const { createItem, updateItem, items } = useItemsStore()
  const { stockItems, loadStock, getItemIngredientes, setItemIngredientes } = useStockStore()

  const [form, setForm] = useState<CreateItemInput>(
    editing
      ? { nombre: editing.nombre, precio: editing.precio, descripcion: editing.descripcion, categoria: editing.categoria }
      : EMPTY
  )
  const [ingredientes, setIngredientes] = useState<ItemIngrediente[]>([])
  const [newStockId, setNewStockId] = useState("")
  const [newCantidad, setNewCantidad] = useState("1")
  const [error, setError] = useState("")

  useEffect(() => {
    loadStock()
    if (editing) {
      getItemIngredientes(editing.id).then(setIngredientes)
    }
  }, [])

  const categorias = [...new Set(items.map((i) => i.categoria))]
  const categoryOptions = ["Panchis", "Promos", "Bebidas", "General", ...categorias.filter(c => !["Panchis", "Promos", "Bebidas", "General"].includes(c))]
    .map((c) => ({ value: c, label: c }))

  const stockOptions = stockItems
    .filter((s) => !ingredientes.some((i) => i.stockItemId === s.id))
    .map((s) => ({ value: s.id.toString(), label: `${s.nombre} (${s.unidad})` }))

  const handleSelectIngrediente = (stockItemIdStr: string) => {
    if (!stockItemIdStr) return
    const stock = stockItems.find((s) => s.id.toString() === stockItemIdStr)
    if (!stock) return
    setIngredientes((prev) => [...prev, {
      stockItemId: stock.id,
      nombre: stock.nombre,
      cantidad: parseInt(newCantidad) || 1,
      unidad: stock.unidad,
    }])
    setNewStockId("")
    setNewCantidad("1")
  }

  const removeIngrediente = (stockItemId: number) => {
    setIngredientes((prev) => prev.filter((i) => i.stockItemId !== stockItemId))
  }

  const updateIngredienteCantidad = (stockItemId: number, raw: number) => {
    const cantidad = Math.max(1, Math.floor(raw))
    setIngredientes((prev) =>
      prev.map((i) => i.stockItemId === stockItemId ? { ...i, cantidad } : i)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const itemData = { ...form, precio: Number(form.precio) }
      let itemId: number
      if (editing) {
        await updateItem(editing.id, itemData)
        itemId = editing.id
      } else {
        itemId = await createItem(itemData)
      }
      await setItemIngredientes(itemId, ingredientes.map((i) => ({
        stockItemId: i.stockItemId,
        cantidad: i.cantidad,
      })))
      onDone()
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="item-form">
      {error && <div className="error-message">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="nombre">Nombre del Item</label>
          <input
            id="nombre"
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
            value={form.precio || ""}
            onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })}
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
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Descripción del item"
        />
      </div>
      <CustomSelect
        label="Categoría"
        value={form.categoria}
        onChange={(val) => setForm({ ...form, categoria: val })}
        allowCreate
        options={categoryOptions}
      />

      <div className="ingredientes-section">
        <label className="ingredientes-label">Ingredientes de Stock</label>
        <p className="ingredientes-hint">El stock se descuenta automáticamente al crear una orden</p>

        {ingredientes.length > 0 && (
          <div className="ingredientes-list">
            {ingredientes.map((ing) => (
              <div key={ing.stockItemId} className="ingrediente-row">
                <span className="ingrediente-nombre">{ing.nombre}</span>
                <QuantityInput
                  value={ing.cantidad}
                  onChange={(v) => updateIngredienteCantidad(ing.stockItemId, v)}
                />
                <span className="ingrediente-unidad">{ing.unidad}</span>
                <button type="button" className="btn-small btn-delete" onClick={() => removeIngrediente(ing.stockItemId)}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {stockOptions.length > 0 && (
          <div className="ingrediente-add-row">
            <QuantityInput
              value={parseInt(newCantidad) || 1}
              onChange={(v) => setNewCantidad(String(v))}
            />
            <CustomSelect
              value={newStockId}
              onChange={handleSelectIngrediente}
              placeholder="Seleccionar ingrediente..."
              options={stockOptions}
            />
          </div>
        )}

        {stockItems.length === 0 && (
          <p className="ingredientes-empty">No hay items de stock. Agrégalos en la sección Stock.</p>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <Button icon={Check} variant="success" type="submit">
          {editing ? "Actualizar Item" : "Crear Item"}
        </Button>
      </div>
    </form>
  )
}
