import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import "./Button.css"

interface ButtonProps {
  children: ReactNode
  icon?: LucideIcon
  variant?: "primary" | "success" | "danger" | "secondary"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  className?: string
  title?: string
}

export default function Button({
  children,
  icon: Icon,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  className = "",
  title,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {Icon && <Icon size={size === "sm" ? 16 : size === "lg" ? 24 : 20} />}
      <span>{children}</span>
    </button>
  )
}
