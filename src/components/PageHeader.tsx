import { ReactNode } from "react"

interface PageHeaderProps {
  icon: ReactNode
  title: string
  action?: ReactNode
}

export default function PageHeader({ icon, title, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <h2>{icon}{title}</h2>
      {action}
    </div>
  )
}
