import { useEffect, useState, useMemo } from "react"
import { FilePlus, Printer, CheckCircle, ChevronLeft, ChevronRight, Trash2, MapPin } from "lucide-react"
import QuantityInput from "../components/QuantityInput"
import { useDistancia } from "../hooks/useDistancia"
import { useOrdersStore } from "../stores/useOrdersStore"
import { useItemsStore } from "../stores/useItemsStore"
import { useClientsStore } from "../stores/useClientsStore"
import { usePrinterStore } from "../stores/usePrinterStore"
import { useUIStore } from "../stores/useUIStore"
import CustomSelect from "../components/CustomSelect"
import Button from "../components/Button"
import "../styles/Orders.css"

const formatPrecio = (v: number) =>
  "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Orders() {
  const { orders, loading, createOrder, deleteOrder } = useOrdersStore()
  const loadOrders = useOrdersStore((s) => s.loadOrders)
  const { items } = useItemsStore()
  const loadItems = useItemsStore((s) => s.loadItems)
  const { clientes } = useClientsStore()
  const loadClientes = useClientsStore((s) => s.loadClientes)
  const { printOrder, loadPorts } = usePrinterStore()
  const { ordersView, categoriasActivas } = useUIStore()

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // POS form state
  const [zona, setZona] = useState("")
  const [selectedClienteId, setSelectedClienteId] = useState("")
  const [selectedItems, setSelectedItems] = useState<Map<number, number>>(new Map())
  const [metodoPago, setMetodoPago] = useState("Efectivo")

  const { distancia, duracion, loading: distanciaLoading } = useDistancia(zona)

  // Historial state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  useEffect(() => {
    loadOrders()
    loadItems()
    loadClientes()
    loadPorts()
  }, [])

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000) }
  }

  // POS helpers
  const itemsEnCategoria = useMemo(
    () => categoriasActivas === "Todos" ? items : items.filter((i) => i.categoria === categoriasActivas),
    [items, categoriasActivas]
  )

  const total = useMemo(() => {
    let t = 0
    selectedItems.forEach((qty, id) => {
      const item = items.find((i) => i.id === id)
      if (item) t += item.precio * qty
    })
    return t
  }, [selectedItems, items])

  const updateQty = (id: number, qty: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      qty <= 0 ? next.delete(id) : next.set(id, qty)
      return next
    })
  }

  const generarItemsText = () =>
    Array.from(selectedItems.entries())
      .map(([id, qty]) => {
        const item = items.find((i) => i.id === id)
        return item ? `${qty}x ${item.nombre}` : null
      })
      .filter(Boolean)
      .join("\n")

  const getClienteLabel = () => {
    const c = clientes.find((c) => c.id.toString() === selectedClienteId)
    return c ? `${c.nombre} — ${c.zona}` : ""
  }

  const handleClienteChange = (id: string) => {
    setSelectedClienteId(id)
    if (id) {
      const c = clientes.find((c) => c.id.toString() === id)
      if (c?.zona) setZona(c.zona)
    } else {
      setZona("")
    }
  }

  const resetForm = () => {
    setZona("")
    setSelectedClienteId("")
    setSelectedItems(new Map())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zona || selectedItems.size === 0) {
      notify("Ingresa zona y selecciona al menos un item", true)
      return
    }
    const now = new Date()
    try {
      await createOrder({
        cliente: selectedClienteId ? getClienteLabel() : `Cliente #${Date.now()}`,
        items: generarItemsText(),
        precio: total,
        fecha: now.toISOString().split("T")[0],
        hora: now.toTimeString().split(" ")[0],
        zona,
        itemsVendidos: Array.from(selectedItems.entries()).map(([itemId, cantidad]) => ({ itemId, cantidad })),
      })
      notify("✓ Orden creada exitosamente")
      resetForm()
    } catch (err) {
      notify(`Error: ${err}`, true)
    }
  }

  const handlePrint = async (overrideOrder?: { id: number; cliente: string; items: string; precio: number; zona: string; hora: string }) => {
    const orderData = overrideOrder ?? {
      id: 0,
      cliente: selectedClienteId ? getClienteLabel() : `Cliente #${Date.now()}`,
      items: generarItemsText(),
      precio: total,
      zona,
      hora: new Date().toTimeString().split(" ")[0],
    }
    try {
      await printOrder(orderData as Parameters<typeof printOrder>[0], metodoPago)
      notify("✓ Orden impresa exitosamente")
    } catch (err) {
      notify(`${err}`, true)
    }
  }

  // Historial helpers
  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00")
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split("T")[0])
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  const formatDateDisplay = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("es-AR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

  const dayOrders = useMemo(() => orders.filter((o) => o.fecha === selectedDate), [orders, selectedDate])
  const dayTotal = useMemo(() => dayOrders.reduce((s, o) => s + o.precio, 0), [dayOrders])

  const getCategoriaEmoji = (cat: string) =>
    ({ Panchis: "🌭", Promos: "🎁", Bebidas: "🥤" }[cat] ?? "🍽️")

  if (loading && orders.length === 0 && items.length === 0) {
    return <div className="loading">Cargando...</div>
  }

  // ── HISTORIAL VIEW ─────────────────────────────────────────────────────────
  if (ordersView === "historial") {
    return (
      <div className="historial-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="historial-date-nav">
          <button className="page-btn" onClick={() => navigateDate(-1)}><ChevronLeft size={18} /></button>
          <span className="historial-date-label">{formatDateDisplay(selectedDate)}</span>
          <button className="page-btn" onClick={() => navigateDate(1)} disabled={isToday}><ChevronRight size={18} /></button>
        </div>

        <div className="historial-stats-row">
          <span className="historial-stat"><span className="historial-stat-label">Órdenes</span> {dayOrders.length}</span>
          <span className="historial-stat"><span className="historial-stat-label">Total del día</span> {formatPrecio(dayTotal)}</span>
        </div>

        <div className="historial-table-wrapper">
          {dayOrders.length === 0 ? (
            <p className="no-data">No hay órdenes para este día</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr><th>#</th><th>Cliente</th><th>Zona</th><th>Items</th><th>Hora</th><th>Total</th><th></th></tr>
              </thead>
              <tbody>
                {dayOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.cliente}</td>
                    <td>{order.zona}</td>
                    <td className="items-cell">{order.items}</td>
                    <td>{order.hora}</td>
                    <td className="precio-cell">{formatPrecio(order.precio)}</td>
                    <td className="actions-cell">
                      <button className="btn-small btn-edit" title="Imprimir" onClick={() => handlePrint(order)}><Printer size={14} /></button>
                      <button className="btn-small btn-delete" title="Eliminar" onClick={() => deleteOrder(order.id)}><Trash2 size={14} /></button>
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

  // ── POS VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="pos-container">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="pos-layout">
        {/* Left: Menu grid */}
        <div className="pos-menu">
          <div className="menu-total-bar">
            <span className="menu-total-title"><FilePlus size={16} /> Nueva Orden</span>
            {total > 0 && (
              <span className="menu-total-value">
                <span className="menu-total-label">Total</span> {formatPrecio(total)}
              </span>
            )}
          </div>
          <div className="menu-grid">
            {itemsEnCategoria.map((item) => {
              const qty = selectedItems.get(item.id) ?? 0
              return (
                <div key={item.id} className={`menu-card ${qty > 0 ? "selected" : ""}`}>
                  <div className="card-emoji">{getCategoriaEmoji(item.categoria)}</div>
                  <h3>{item.nombre}</h3>
                  <p className="card-price">{formatPrecio(item.precio)}</p>
                  <QuantityInput
                    value={qty}
                    onChange={(v) => updateQty(item.id, v)}
                    min={0}
                    className="menu-qty"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Order form */}
        <div className="pos-panel">
          <form onSubmit={handleSubmit} className="panel-form">
            <CustomSelect
              label="Cliente"
              value={selectedClienteId}
              onChange={handleClienteChange}
              placeholder="Nuevo cliente (auto)"
              options={[
                { value: "", label: "Nuevo cliente (auto)" },
                ...clientes.map((c) => ({ value: c.id.toString(), label: `${c.nombre} — ${c.zona}` })),
              ]}
            />
            <div className="form-group">
              <label htmlFor="zona">Zona (Dirección)</label>
              <input id="zona" type="text" value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ingresa la zona o dirección" required />
              {distanciaLoading && (
                <span className="distancia-badge distancia-loading">Calculando...</span>
              )}
              {!distanciaLoading && distancia && (
                <span className="distancia-badge">
                  <MapPin size={12} /> {distancia} · {duracion}
                </span>
              )}
            </div>
            <CustomSelect
              label="Método de Pago"
              value={metodoPago}
              onChange={setMetodoPago}
              options={[
                { value: "Efectivo", label: "Efectivo" },
                { value: "Transferencia", label: "Transferencia" },
              ]}
            />

            <div className="panel-divider" />

            <div className="order-items">
              {selectedItems.size === 0 ? (
                <p className="no-items">Selecciona items del menú</p>
              ) : (
                Array.from(selectedItems.entries()).map(([id, qty]) => {
                  const item = items.find((i) => i.id === id)
                  if (!item) return null
                  return (
                    <div key={id} className="order-item">
                      <span className="item-name">{qty}x {item.nombre}</span>
                      <span className="item-price">{formatPrecio(item.precio * qty)}</span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="panel-divider" />

            <div className="btn-row">
              <Button icon={Printer} variant="primary" size="md"
                disabled={selectedItems.size === 0 || !zona}
                onClick={() => handlePrint()} title="Imprimir antes de confirmar">
                Imprimir
              </Button>
              <Button icon={CheckCircle} variant="success" size="md" type="submit"
                disabled={selectedItems.size === 0 || !zona}>
                Crear Orden
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
