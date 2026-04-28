import { Menu, Settings, UserCircle } from "lucide-react"
import { useUIStore } from "../stores/useUIStore"

export default function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle"
          title={sidebarCollapsed ? "Expandir" : "Contraer"}
        >
          <Menu size={24} />
        </button>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" title="Ajustes">
          <Settings size={20} />
        </button>
        <button className="topbar-btn" title="Perfil">
          <UserCircle size={20} />
        </button>
      </div>
    </header>
  )
}
