export default function StatCard({ label, value, icon: Icon, color = 'pip', small = false }) {
  const colorMap = {
    pip:    { card: 'text-pip border-pip-mid/60',    icon: 'text-pip',    label: 'text-muted' },
    amber:  { card: 'text-amber border-amber/60',    icon: 'text-amber',  label: 'text-muted' },
    danger: { card: 'text-danger border-danger/60',  icon: 'text-danger', label: 'text-muted' },
  }
  const theme = colorMap[color] || colorMap.pip

  return (
    <div className={`border ${theme.card} bg-panel rounded-lg ${small ? 'p-2' : 'p-3'} flex flex-col items-center gap-1`}>
      {Icon && <Icon size={small ? 14 : 18} className={theme.icon} />}
      <span className={`${small ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</span>
      <span className={`text-xs ${theme.label} text-center leading-tight tracking-wide`}>{label}</span>
    </div>
  )
}
