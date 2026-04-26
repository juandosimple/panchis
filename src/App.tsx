import { useEffect, useState } from "react"
import Login from "./pages/Login"
import Orders from "./pages/Orders"
import "./App.css"

type Page = "dashboard" | "orders" | "clientes" | "reportes"

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    setToken(savedToken)
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
    setCurrentPage("dashboard")
  }

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  if (!token) {
    return <Login onLoginSuccess={setToken} />
  }

  return (
    <main className="dashboard">
      <div className="navbar">
        <h1>🌮 Panchis</h1>
        <nav className="nav-menu">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={currentPage === "dashboard" ? "nav-btn active" : "nav-btn"}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage("orders")}
            className={currentPage === "orders" ? "nav-btn active" : "nav-btn"}
          >
            📋 Órdenes
          </button>
          <button
            onClick={() => setCurrentPage("clientes")}
            className={currentPage === "clientes" ? "nav-btn active" : "nav-btn"}
          >
            👥 Clientes
          </button>
          <button
            onClick={() => setCurrentPage("reportes")}
            className={currentPage === "reportes" ? "nav-btn active" : "nav-btn"}
          >
            📊 Reportes
          </button>
        </nav>
        <button onClick={handleLogout} className="logout-btn">
          Cerrar Sesión
        </button>
      </div>

      <div className="page-content">
        {currentPage === "dashboard" && (
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
              <div className="feature-card" onClick={() => setCurrentPage("reportes")}>
                <h3>📊 Reportes</h3>
                <p>Visualiza tus estadísticas</p>
              </div>
            </div>
          </div>
        )}

        {currentPage === "orders" && <Orders />}

        {currentPage === "clientes" && (
          <div className="container">
            <h2>👥 Clientes</h2>
            <p>Módulo de clientes - Próximamente</p>
          </div>
        )}

        {currentPage === "reportes" && (
          <div className="container">
            <h2>📊 Reportes</h2>
            <p>Módulo de reportes - Próximamente</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
