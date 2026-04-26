import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/tauri"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import "../styles/Reportes.css"

interface DailySales {
  fecha: string
  total: number
  cantidad: number
}

interface ZoneSales {
  zona: string
  total: number
  cantidad: number
}

export default function Reportes() {
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [zoneSales, setZoneSales] = useState<ZoneSales[]>([])
  const [totalSales, setTotalSales] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const COLORS = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe"]

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const [daily, zones, total] = await Promise.all([
        invoke<DailySales[]>("get_daily_sales"),
        invoke<ZoneSales[]>("get_sales_by_zone"),
        invoke<number>("get_total_sales"),
      ])

      setDailySales(daily)
      setZoneSales(zones)
      setTotalSales(total)
    } catch (err) {
      setError(`Error loading reports: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Cargando reportes...</div>
  }

  return (
    <div className="reportes-container">
      <h2>📊 Reportes y Estadísticas</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-summary">
        <div className="stat-card">
          <h3>Ventas Totales</h3>
          <p className="stat-value">${totalSales.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Total de Órdenes</h3>
          <p className="stat-value">
            {dailySales.reduce((sum, day) => sum + day.cantidad, 0)}
          </p>
        </div>
        <div className="stat-card">
          <h3>Promedio por Orden</h3>
          <p className="stat-value">
            ${
              dailySales.reduce((sum, day) => sum + day.cantidad, 0) > 0
                ? (totalSales / dailySales.reduce((sum, day) => sum + day.cantidad, 0)).toFixed(2)
                : "0.00"
            }
          </p>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-wrapper">
          <h3>Ventas por Día</h3>
          {dailySales.length === 0 ? (
            <p className="no-data">No hay datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dailySales}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  formatter={(value) => `$${(value as number).toFixed(2)}`}
                />
                <Bar dataKey="total" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-wrapper">
          <h3>Ventas por Zona</h3>
          {zoneSales.length === 0 ? (
            <p className="no-data">No hay datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={zoneSales}
                  dataKey="total"
                  nameKey="zona"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {zoneSales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${(value as number).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="table-container">
        <h3>Detalle de Ventas por Zona</h3>
        {zoneSales.length === 0 ? (
          <p className="no-data">No hay datos disponibles</p>
        ) : (
          <table className="reportes-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Total Ventas</th>
                <th>Cantidad de Órdenes</th>
                <th>Promedio por Orden</th>
              </tr>
            </thead>
            <tbody>
              {zoneSales.map((zone) => (
                <tr key={zone.zona}>
                  <td>{zone.zona}</td>
                  <td className="precio">${zone.total.toFixed(2)}</td>
                  <td>{zone.cantidad}</td>
                  <td className="promedio">
                    ${(zone.total / zone.cantidad).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="action-buttons">
        <button onClick={loadReports} className="btn-refresh">
          🔄 Refrescar Reportes
        </button>
      </div>
    </div>
  )
}
