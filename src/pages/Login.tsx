import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import "../styles/Login.css"

interface LoginProps {
  onLoginSuccess: (token: string) => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await invoke<{
        success: boolean
        message: string
        token?: string
      }>("login_user", { username, password })

      if (response.success && response.token) {
        localStorage.setItem("auth_token", response.token)
        onLoginSuccess(response.token)
      } else {
        setError(response.message)
      }
    } catch (err) {
      setError(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🌮 Panchis</h1>
        <h2>Iniciar Sesión</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", color: "#999", fontSize: "0.9rem" }}>
          Aplicación privada
        </p>
      </div>
    </div>
  )
}
