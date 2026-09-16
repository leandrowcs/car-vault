import type { ReactNode } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import './RecordCard.css'

interface RecordCardProps {
  icon: ReactNode
  title: string
  date: string
  amount: string
  badge?: ReactNode
  metrics: { label: string; value: ReactNode }[]
  actionLabel: string
  onEdit: () => void
  onDelete: () => void
}

export function RecordCard({ icon, title, date, amount, badge, metrics, actionLabel, onEdit, onDelete }: RecordCardProps) {
  return (
    <article className="record-card">
      <header className="record-card-heading">
        <span className="record-card-icon" aria-hidden="true">{icon}</span>
        <div className="record-card-title">
          <span className="record-card-date">{date}</span>
          <h4>{title}</h4>
        </div>
      </header>
      <div className="record-card-total">
        <strong className="font-mono">{amount}</strong>
        {badge}
      </div>
      <dl className="record-card-metrics">
        {metrics.map(({ label, value }) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <footer className="record-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={`Edit ${actionLabel}`}>
          <Edit2 size={14} /> Edit
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDelete} aria-label={`Delete ${actionLabel}`}>
          <Trash2 size={14} color="var(--vault-danger)" /> Delete
        </button>
      </footer>
    </article>
  )
}
