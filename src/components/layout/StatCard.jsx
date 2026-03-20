export default function StatCard({ label, value, icon: Icon, color = 'pip', small = false }) {
  const colorMap = {
    pip: 'text-pip border-pip-dim',
    amber: 'text-amber border-amber-dim',
    danger: 'text-danger border-danger-dim',
  }

  return (
    <div className={`border ${colorMap[color] || colorMap.pip} bg-panel rounded-lg ${small ? 'p-2' : 'p-3'} flex flex-col items-center gap-1`}>
      {Icon && <Icon size={small ? 14 : 18} className="opacity-70" />}
      <span className={`${small ? 'text-lg' : 'text-2xl'} font-bold`}>{value}</span>
      <span className="text-xs opacity-60 text-center leading-tight">{label}</span>
    </div>
  )
}
