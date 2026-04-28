import { LayoutGrid, History, Clock } from "lucide-react"
import { useUIStore } from "../stores/useUIStore"
import { useItemsStore } from "../stores/useItemsStore"
import { useOrdersStore } from "../stores/useOrdersStore"

export default function NavBar() {
  const { ordersView, categoriasActivas, showOrdersModal, setOrdersView, setCategoriasActivas, setShowOrdersModal } = useUIStore()
  const getCategorias = useItemsStore((s) => s.getCategorias)
  const { orders, sentOrderIds } = useOrdersStore()

  const pendingCount = orders.filter((o) => !sentOrderIds.has(o.id)).length
  const categorias = getCategorias()

  return (
    <nav className="nav-bar">
      {ordersView === "pos" && (
        <>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriasActivas(cat)}
              className={`nav-bar-btn ${categoriasActivas === cat ? "active" : ""}`}
            >
              {cat === "Todos" && <LayoutGrid size={16} />}
              {cat}
            </button>
          ))}
        </>
      )}
      <button
        onClick={() => setOrdersView(ordersView === "pos" ? "historial" : "pos")}
        className={`nav-bar-btn historial-btn ${ordersView === "historial" ? "active" : ""}`}
      >
        <History size={16} /> Historial
      </button>
      <button
        onClick={() => setShowOrdersModal(!showOrdersModal)}
        className={`nav-bar-btn orders-btn ${showOrdersModal ? "active" : ""}`}
        title="Ver órdenes en progreso"
      >
        <Clock size={16} /> Órdenes en Progreso
        <span className="order-badge">{pendingCount}</span>
      </button>
    </nav>
  )
}
