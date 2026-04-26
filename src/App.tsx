import { useState } from "react"
import "./App.css"

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="container">
      <h1>Panchis - Gestor de Órdenes</h1>
      <div className="card">
        <p>Counter: {count}</p>
        <button onClick={() => setCount((count) => count + 1)}>
          Increment
        </button>
      </div>
      <p>Aplicación de escritorio para gestionar tu negocio de panchos</p>
    </main>
  )
}

export default App
