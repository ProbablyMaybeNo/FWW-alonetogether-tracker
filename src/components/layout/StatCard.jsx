export default function StatCard({ label, value, icon: Icon, color = 'pip', small = false }) {
  const colorMap = {
    pip:    { card: 'border-pip-mid/60',   icon: 'text-pip',    label: 'text-muted', value: 'text-title' },
    amber:  { card: 'border-amber/60',     icon: 'text-amber',  label: 'text-muted', value: 'text-amber' },
    danger: { card: 'border-danger/60',    icon: 'text-danger', label: 'text-muted', value: 'text-danger' },
  }
  const theme = colorMap[color] || colorMap.pip

  return (
    <div className={`border ${theme.card} bg-panel rounded-lg ${small ? 'p-2' : 'p-3'} flex flex-col items-center gap-1`}>
      {Icon && <Icon size={small ? 14 : 18} className={theme.icon} />}
      <span className={`${small ? 'text-lg' : 'text-2xl'} font-bold ${theme.value}`}>{value}</span>
      <span className={`text-xs ${theme.label} text-center leading-tight tracking-wide`}>{label}</span>
    </div>
  )
}
