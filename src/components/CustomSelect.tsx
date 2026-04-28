import { useState, useRef, useEffect } from "react"
import { ChevronDown, Plus } from "lucide-react"
import "./CustomSelect.css"

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label?: string
  placeholder?: string
  allowCreate?: boolean
}

export default function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  allowCreate = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newValue, setNewValue] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allOptions = allowCreate && newValue === "" ? options : options
  const selectedOption = allOptions.find(opt => opt.value === value) || (value ? { value, label: value } : null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCreate(false)
        setNewValue("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCreate = () => {
    const trimmed = newValue.trim()
    if (!trimmed) return
    onChange(trimmed)
    setIsOpen(false)
    setShowCreate(false)
    setNewValue("")
  }

  return (
    <div className="custom-select-wrapper">
      {label && <label className="custom-select-label">{label}</label>}
      <div className="custom-select" ref={dropdownRef}>
        <button
          type="button"
          className="custom-select-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{selectedOption?.label || placeholder || "Seleccionar..."}</span>
          <ChevronDown size={18} className={`chevron ${isOpen ? "open" : ""}`} />
        </button>

        {isOpen && (
          <div className="custom-select-dropdown">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                className={`custom-select-option ${value === option.value ? "active" : ""}`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                <span className="option-label">{option.label}</span>
                {value === option.value && <span className="checkmark">✓</span>}
              </button>
            ))}

            {allowCreate && !showCreate && (
              <button
                type="button"
                className="custom-select-option custom-select-new-option"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={14} />
                <span className="option-label">Nueva categoría...</span>
              </button>
            )}

            {allowCreate && showCreate && (
              <div className="custom-select-create">
                <input
                  autoFocus
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate() } }}
                  placeholder="Nombre de categoría"
                />
                <button type="button" onClick={handleCreate}>OK</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
