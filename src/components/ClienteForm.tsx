import { useState } from "react"
import { Check } from "lucide-react"
import { Cliente, CreateClienteInput } from "../types"
import { useClientsStore } from "../stores/useClientsStore"
import Button from "./Button"

interface ClienteFormProps {
  editing: Cliente | null
  onDone: () => void
}

const EMPTY: CreateClienteInput = { nombre: "", telefono: "", direccion: "", zona: "" }

export default function ClienteForm({ editing, onDone }: ClienteFormProps) {
  const { createCliente, updateCliente } = useClientsStore()
  const [form, setForm] = useState<CreateClienteInput>(
    editing ? { nombre: editing.nombre, telefono: editing.telefono, direccion: editing.direccion, zona: editing.zona } : EMPTY
  )
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      if (editing) {
        await updateCliente(editing.id, form)
      } else {
        await createCliente(form)
      }
      onDone()
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cliente-form">
      {error && <div className="error-message">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" type="text" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre del cliente" required />
        </div>
        <div className="form-group">
          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" type="tel" value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="+1234567890" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="direccion">Dirección</label>
        <input id="direccion" type="text" value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          placeholder="Dirección completa" />
      </div>
      <div className="form-group">
        <label htmlFor="zona">Zona</label>
        <input id="zona" type="text" value={form.zona}
          onChange={(e) => setForm({ ...form, zona: e.target.value })}
          placeholder="Zona de entrega" required />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <Button icon={Check} variant="success" type="submit">
          {editing ? "Actualizar Cliente" : "Crear Cliente"}
        </Button>
      </div>
    </form>
  )
}
