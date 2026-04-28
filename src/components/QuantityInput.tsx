interface QuantityInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  className?: string
}

export default function QuantityInput({ value, onChange, min = 1, className }: QuantityInputProps) {
  return (
    <div className={`qty-stepper ${className ?? ""}`}>
      <button
        type="button"
        className="qty-stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <span className="qty-stepper-value">{value}</span>
      <button
        type="button"
        className="qty-stepper-btn"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
