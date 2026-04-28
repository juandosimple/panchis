import { Home, ClipboardList, Users, Package, BarChart2, Archive, Settings, LogOut } from "lucide-react"
import { useUIStore } from "../stores/useUIStore"
import { useAuthStore } from "../stores/useAuthStore"
import { Page } from "../types"

const NAV_ITEMS: { page: Page; icon: typeof Home; label: string }[] = [
  { page: "dashboard",     icon: Home,          label: "Dashboard" },
  { page: "orders",        icon: ClipboardList, label: "Órdenes" },
  { page: "clientes",      icon: Users,         label: "Clientes" },
  { page: "items",         icon: Package,       label: "Items" },
  { page: "stock",         icon: Archive,       label: "Stock" },
  { page: "reportes",      icon: BarChart2,     label: "Reportes" },
  { page: "configuracion", icon: Settings,      label: "Configuración" },
]

export default function Sidebar() {
  const { currentPage, sidebarCollapsed, setCurrentPage } = useUIStore()
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ page, icon: Icon, label }) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`nav-item ${currentPage === page ? "active" : ""}`}
            title={label}
          >
            <Icon size={20} className="icon" />
            <span className="label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={logout} className="logout-btn">
          <LogOut size={20} className="icon" />
          <span className="label">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
