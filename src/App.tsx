import { useEffect, useState } from "react"
import { useAuthStore } from "./stores/useAuthStore"
import { useUIStore } from "./stores/useUIStore"
import { useOrdersStore } from "./stores/useOrdersStore"
import { useItemsStore } from "./stores/useItemsStore"
import { geocodeOrigin } from "./hooks/useDistancia"
import { useUpdater } from "./hooks/useUpdater"
import Login from "./pages/Login"
import Orders from "./pages/Orders"
import Clientes from "./pages/Clientes"
import Items from "./pages/Items"
import Stock from "./pages/Stock"
import Reportes from "./pages/Reportes"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import NavBar from "./components/NavBar"
import OrdersModal from "./components/OrdersModal"
import "./styles/tokens.css"
import "./App.css"

function Dashboard() {
  const setCurrentPage = useUIStore((s) => s.setCurrentPage)
  return (
    <div className="container">
      <h2>Bienvenido a Panchis</h2>
      <p>Gestor de órdenes para tu negocio de panchos</p>
      <div className="features">
        <div className="feature-card" onClick={() => setCurrentPage("orders")}>
          <h3>📋 Órdenes</h3>
          <p>Crea y gestiona órdenes</p>
        </div>
        <div className="feature-card" onClick={() => setCurrentPage("clientes")}>
          <h3>👥 Clientes</h3>
          <p>Administra tus clientes</p>
        </div>
        <div className="feature-card" onClick={() => setCurrentPage("items")}>
          <h3>🍴 Items</h3>
          <p>Gestiona tu catálogo</p>
        </div>
        <div className="feature-card" onClick={() => setCurrentPage("reportes")}>
          <h3>📊 Reportes</h3>
          <p>Visualiza tus estadísticas</p>
        </div>
      </div>
    </div>
  )
}

function Configuracion() {
  const logout = useAuthStore((s) => s.logout)
  const [localAddress, setLocalAddress] = useState(
    () => localStorage.getItem("panchis_local_address") ?? ""
  )
  const [ciudad, setCiudad] = useState(
    () => localStorage.getItem("panchis_ciudad") ?? "Buenos Aires"
  )
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "warning" | "error">("idle")
  const [saveMsg, setSaveMsg] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus("idle")
    localStorage.setItem("panchis_local_address", localAddress)
    localStorage.setItem("panchis_ciudad", ciudad)
    localStorage.removeItem("panchis_local_coords") // invalidate cached coords

    if (localAddress.trim()) {
      const coords = await geocodeOrigin(localAddress, ciudad)
      if (coords) {
        localStorage.setItem("panchis_local_coords", JSON.stringify({ address: localAddress, ...coords }))
        setSaveStatus("success")
        setSaveMsg(`✓ Guardado y geocodificado (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`)
      } else {
        setSaveStatus("warning")
        setSaveMsg("Guardado, pero no se pudo geocodificar. Probá con la dirección más completa (ej: Juan Bautista Alberdi 4430, Villa Ballester)")
      }
    } else {
      setSaveStatus("success")
      setSaveMsg("✓ Guardado")
    }
    setSaving(false)
    setTimeout(() => setSaveStatus("idle"), 6000)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem", borderRadius: "8px",
    border: "1.5px solid var(--border)", background: "rgba(0,0,0,0.3)",
    color: "var(--text-primary)", fontFamily: "inherit", fontSize: "0.95rem",
  }

  return (
    <div className="container">
      <h2>⚙️ Configuración</h2>
      <div className="config-section">
        <div className="config-card">
          <h3>Dirección del Local</h3>
          <p className="config-text">Se usa para calcular la distancia a cada entrega</p>
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Dirección</label>
            <input
              type="text"
              value={localAddress}
              onChange={(e) => setLocalAddress(e.target.value)}
              placeholder="Ej: Juan B Alberdi 4430, Villa Ballester"
              style={inputStyle}
            />
          </div>
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Ciudad (para geocodificación)</label>
            <input
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej: Buenos Aires"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: "0.5rem", padding: "0.5rem 1.25rem", background: "var(--success)", color: "white", border: "none", borderRadius: "8px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          {saveStatus !== "idle" && (
            <p style={{
              marginTop: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.85rem",
              color: saveStatus === "success" ? "var(--success)" : saveStatus === "warning" ? "#f59e0b" : "var(--error)",
              background: saveStatus === "success" ? "rgba(16,185,129,0.1)" : saveStatus === "warning" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${saveStatus === "success" ? "rgba(16,185,129,0.25)" : saveStatus === "warning" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}>
              {saveMsg}
            </p>
          )}
        </div>
        <UpdateCard />
        <div className="config-card">
          <h3>Sesión</h3>
          <div className="config-divider">
            <button onClick={logout} className="logout-btn logout-btn-full">Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpdateCard() {
  const { checking, downloading, checkForUpdate } = useUpdater()
  const busy = checking || downloading
  const label = downloading ? "Descargando..." : checking ? "Buscando..." : "Buscar actualizaciones"

  return (
    <div className="config-card">
      <h3>Actualizaciones</h3>
      <p className="config-text">La app chequea actualizaciones al iniciar. También podés buscar manualmente.</p>
      <button
        onClick={() => checkForUpdate(false)}
        disabled={busy}
        style={{ marginTop: "0.5rem", padding: "0.5rem 1.25rem", background: "var(--btn-primary)", color: "white", border: "none", borderRadius: "8px", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600, opacity: busy ? 0.6 : 1 }}
      >
        {label}
      </button>
    </div>
  )
}

const PAGE_MAP = {
  dashboard:    <Dashboard />,
  orders:       <Orders />,
  clientes:     <Clientes />,
  items:        <Items />,
  stock:        <Stock />,
  reportes:     <Reportes />,
  configuracion: <Configuracion />,
} as const

export default function App() {
  const token = useAuthStore((s) => s.token)
  const { currentPage, showOrdersModal } = useUIStore()
  const loadOrders = useOrdersStore((s) => s.loadOrders)
  const loadItems = useItemsStore((s) => s.loadItems)
  const { checkForUpdate } = useUpdater()

  // Bootstrap on login
  useEffect(() => {
    if (!token) return
    loadOrders()
    loadItems()
    // Silent update check shortly after login
    const t = setTimeout(() => { checkForUpdate(true) }, 3000)
    return () => clearTimeout(t)
  }, [token])

  if (!token) return <Login />

  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="right-panel">
        <TopBar />
        {currentPage === "orders" && <NavBar />}
        <main className="dashboard">
          <div className="page-content">
            {PAGE_MAP[currentPage]}
          </div>
        </main>
        {showOrdersModal && <OrdersModal />}
      </div>
    </div>
  )
}
