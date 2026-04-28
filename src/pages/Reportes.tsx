import { useState, useEffect, useMemo } from "react"
import { BarChart2, Clock, Printer, Trash2, RefreshCw, TrendingUp, ShoppingBag } from "lucide-react"
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { ReportTab } from "../types"
import { useReportsStore } from "../stores/useReportsStore"
import { useOrdersStore } from "../stores/useOrdersStore"
import { usePrinterStore } from "../stores/usePrinterStore"
import StatCard from "../components/StatCard"
import Button from "../components/Button"
import "../styles/Reportes.css"

const PIE_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171"]

const formatPrecio = (v: number) =>
  "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatMes = (mesStr: string) => {
  const d = new Date(mesStr + "-15")
  return d.toLocaleDateString("es-AR", { month: "short", year: "numeric" })
}

export default function Reportes() {
  const { dailySales, zoneSales, totalSales, loading, loadReports } = useReportsStore()
  const { orders, deleteOrder } = useOrdersStore()
  const loadOrders = useOrdersStore((s) => s.loadOrders)
  const { printOrder } = usePrinterStore()

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState<ReportTab>("diario")

  useEffect(() => {
    loadReports()
    loadOrders()
  }, [])

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 4000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 3000) }
  }

  const handleRefresh = () => {
    loadReports()
    loadOrders()
  }

  const handlePrintOrder = async (order: (typeof orders)[0]) => {
    try {
      await printOrder(order, "N/A")
      notify("✓ Orden impresa exitosamente")
    } catch (err) {
      notify(`${err}`, true)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro?")) return
    try {
      await deleteOrder(id)
      loadReports()
    } catch (err) {
      notify(`Error: ${err}`, true)
    }
  }

  const monthlySales = useMemo(() => {
    const map = new Map<string, { total: number; cantidad: number }>()
    dailySales.forEach(d => {
      const mes = d.fecha.substring(0, 7)
      const prev = map.get(mes) ?? { total: 0, cantidad: 0 }
      map.set(mes, { total: prev.total + d.total, cantidad: prev.cantidad + d.cantidad })
    })
    return Array.from(map.entries())
      .map(([mes, v]) => ({ mes, mesLabel: formatMes(mes), ...v }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
  }, [dailySales])

  const currentMonthKey = new Date().toISOString().substring(0, 7)
  const currentMonth = monthlySales.find(m => m.mes === currentMonthKey)
  const bestMonth = [...monthlySales].sort((a, b) => b.total - a.total)[0]

  const topProducts = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach(order => {
      order.items.split("\n").forEach(line => {
        const match = line.match(/^(\d+)x (.+)$/)
        if (match) {
          const qty = parseInt(match[1])
          const name = match[2].trim()
          map.set(name, (map.get(name) ?? 0) + qty)
        }
      })
    })
    return Array.from(map.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [orders])

  const totalOrderCount = dailySales.reduce((s, d) => s + d.cantidad, 0)

  if (loading && dailySales.length === 0) return <div className="loading">Cargando reportes...</div>

  return (
    <div className="reportes-container">
      <div className="reportes-header">
        <h2><BarChart2 size={28} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />Reportes y Estadísticas</h2>
        <Button icon={RefreshCw} variant="secondary" onClick={handleRefresh}>
          Refrescar
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="stats-summary">
        <StatCard title="Ventas Totales" value={formatPrecio(totalSales)} />
        <StatCard title="Total de Órdenes" value={totalOrderCount} />
        <StatCard
          title="Promedio por Orden"
          value={totalOrderCount > 0 ? formatPrecio(totalSales / totalOrderCount) : formatPrecio(0)}
        />
      </div>

      <div className="report-tabs">
        <button className={`report-tab ${activeTab === "diario" ? "active" : ""}`} onClick={() => setActiveTab("diario")}>
          <BarChart2 size={15} /> Diario
        </button>
        <button className={`report-tab ${activeTab === "mensual" ? "active" : ""}`} onClick={() => setActiveTab("mensual")}>
          <TrendingUp size={15} /> Mensual
        </button>
        <button className={`report-tab ${activeTab === "productos" ? "active" : ""}`} onClick={() => setActiveTab("productos")}>
          <ShoppingBag size={15} /> Productos
        </button>
      </div>

      {activeTab === "diario" && (
        <>
          <div className="charts-container">
            <div className="chart-wrapper">
              <h3>Ventas por Día</h3>
              {dailySales.length === 0 ? (
                <p className="no-data">No hay datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...dailySales].reverse()} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="fecha" angle={-45} textAnchor="end" height={80} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v) => [formatPrecio(v as number), "Total"]}
                    />
                    <Bar dataKey="total" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-wrapper">
              <h3>Ventas por Zona</h3>
              {zoneSales.length === 0 ? (
                <p className="no-data">No hay datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={zoneSales} dataKey="total" nameKey="zona" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                      {zoneSales.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      formatter={(v) => [formatPrecio(v as number), "Total"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="table-container">
            <h3>Detalle por Zona</h3>
            {zoneSales.length === 0 ? (
              <p className="no-data">No hay datos disponibles</p>
            ) : (
              <table className="reportes-table">
                <thead>
                  <tr><th>Zona</th><th>Total Ventas</th><th>Órdenes</th><th>Promedio</th></tr>
                </thead>
                <tbody>
                  {zoneSales.map(zone => (
                    <tr key={zone.zona}>
                      <td>{zone.zona}</td>
                      <td className="precio">{formatPrecio(zone.total)}</td>
                      <td>{zone.cantidad}</td>
                      <td className="promedio">{formatPrecio(zone.total / zone.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="table-container">
            <h3><Clock size={18} style={{ marginRight: "0.4rem", verticalAlign: "middle" }} />Historial de Órdenes</h3>
            {orders.length === 0 ? (
              <p className="no-data">No hay órdenes aún</p>
            ) : (
              <table className="reportes-table">
                <thead>
                  <tr><th>ID</th><th>Cliente</th><th>Items</th><th>Total</th><th>Zona</th><th>Hora</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.cliente}</td>
                      <td className="items-cell">{order.items}</td>
                      <td className="precio">{formatPrecio(order.precio)}</td>
                      <td>{order.zona}</td>
                      <td>{order.hora}</td>
                      <td className="actions-cell">
                        <button className="btn-small btn-edit" title="Imprimir" onClick={() => handlePrintOrder(order)}><Printer size={14} /></button>
                        <button className="btn-small btn-delete" title="Eliminar" onClick={() => handleDelete(order.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === "mensual" && (
        <>
          <div className="stats-summary">
            <StatCard title="Mes Actual" value={formatPrecio(currentMonth?.total ?? 0)} sub={`${currentMonth?.cantidad ?? 0} órdenes`} />
            <StatCard title="Mejor Mes" value={formatPrecio(bestMonth?.total ?? 0)} sub={bestMonth ? formatMes(bestMonth.mes) : "—"} />
            <StatCard title="Meses con ventas" value={monthlySales.length} />
          </div>

          <div className="chart-wrapper" style={{ marginBottom: "2rem" }}>
            <h3>Ventas Mensuales</h3>
            {monthlySales.length === 0 ? (
              <p className="no-data">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlySales} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mesLabel" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v) => [formatPrecio(v as number), "Total"]}
                  />
                  <Bar dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="table-container">
            <h3>Detalle Mensual</h3>
            {monthlySales.length === 0 ? (
              <p className="no-data">No hay datos disponibles</p>
            ) : (
              <table className="reportes-table">
                <thead>
                  <tr><th>Mes</th><th>Total Ventas</th><th>Órdenes</th><th>Promedio</th></tr>
                </thead>
                <tbody>
                  {[...monthlySales].reverse().map(m => (
                    <tr key={m.mes}>
                      <td style={{ textTransform: "capitalize" }}>{formatMes(m.mes)}</td>
                      <td className="precio">{formatPrecio(m.total)}</td>
                      <td>{m.cantidad}</td>
                      <td className="promedio">{formatPrecio(m.total / m.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === "productos" && (
        <>
          <div className="chart-wrapper" style={{ marginBottom: "2rem" }}>
            <h3>Productos más pedidos</h3>
            {topProducts.length === 0 ? (
              <p className="no-data">No hay datos disponibles</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(250, topProducts.length * 42)}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis dataKey="nombre" type="category" width={140} tick={{ fill: "#e5e7eb", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v) => [v, "Unidades vendidas"]}
                  />
                  <Bar dataKey="cantidad" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="table-container">
            <h3>Ranking de Productos</h3>
            {topProducts.length === 0 ? (
              <p className="no-data">No hay datos disponibles</p>
            ) : (
              <table className="reportes-table">
                <thead>
                  <tr><th>#</th><th>Producto</th><th>Unidades vendidas</th></tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.nombre}>
                      <td style={{ color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.nombre}</td>
                      <td>
                        <div className="product-bar-row">
                          <div className="product-bar" style={{ width: `${(p.cantidad / topProducts[0].cantidad) * 100}%` }} />
                          <span>{p.cantidad}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
