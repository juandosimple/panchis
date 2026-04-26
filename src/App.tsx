import { useEffect, useState } from "react"
import Login from "./pages/Login"
import "./App.css"

function App() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    setToken(savedToken)
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
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
        <button onClick={handleLogout} className="logout-btn">
          Cerrar Sesión
        </button>
      </div>

      <div className="container">
        <h2>Bienvenido a Panchis</h2>
        <p>Gestor de órdenes para tu negocio de panchos</p>

        <div className="features">
          <div className="feature-card">
            <h3>📋 Órdenes</h3>
            <p>Crea y gestiona órdenes</p>
          </div>
          <div className="feature-card">
            <h3>👥 Clientes</h3>
            <p>Administra tus clientes</p>
          </div>
          <div className="feature-card">
            <h3>📊 Reportes</h3>
            <p>Visualiza tus estadísticas</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
