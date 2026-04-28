interface StatCardProps {
  title: string
  value: string | number
  sub?: string
}

export default function StatCard({ title, value, sub }: StatCardProps) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  )
}
