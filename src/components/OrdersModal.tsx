import { Check } from "lucide-react"
import { useUIStore } from "../stores/useUIStore"
import { useOrdersStore } from "../stores/useOrdersStore"

export default function OrdersModal() {
  const setShowOrdersModal = useUIStore((s) => s.setShowOrdersModal)
  const { orders, sentOrderIds, markAsSent } = useOrdersStore()

  const formatPrecio = (v: number) =>
    "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="modal-overlay" onClick={() => setShowOrdersModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Órdenes en Progreso</h2>
          <button onClick={() => setShowOrdersModal(false)} className="modal-close">✕</button>
        </div>
        <div className="modal-body">
          {orders.length === 0 ? (
            <p className="no-orders">No hay órdenes en progreso</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Zona</th>
                  <th>Total</th>
                  <th>Hora</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.zona}</td>
                    <td className="precio">{formatPrecio(order.precio)}</td>
                    <td>{order.hora}</td>
                    <td className="actions-cell">
                      {sentOrderIds.has(order.id) ? (
                        <span className="badge-enviada">
                          <Check size={14} /> Enviada
                        </span>
                      ) : (
                        <button
                          onClick={() => markAsSent(order.id)}
                          className="btn-complete"
                          title="Marcar como enviada"
                        >
                          Enviar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
