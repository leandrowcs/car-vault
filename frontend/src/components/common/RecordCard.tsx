import { useTranslation } from '../../hooks/useTranslation'
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
  actionsInHeader?: boolean
  onEdit: () => void
  onDelete: () => void
}

export function RecordCard({ icon, title, date, amount, badge, metrics, actionLabel, actionsInHeader = false, onEdit, onDelete }: RecordCardProps) {
  const t = useTranslation()
  return (
    <article className="record-card">
      <header className="record-card-heading">
        <span className="record-card-icon" aria-hidden="true">{icon}</span>
        <div className="record-card-title">
          <span className="record-card-date">{date}</span>
          <h4>{title}</h4>
        </div>
        {actionsInHeader && (
          <div className="record-card-header-actions">
            <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onEdit} aria-label={t("Edit {0}", { "0": actionLabel ?? '' })} title={t("Edit fill-up")}>
              <Edit2 size={14} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onDelete} aria-label={t("Delete {0}", { "0": actionLabel ?? '' })} title={t("Delete fill-up")}>
              <Trash2 size={14} color="var(--vault-danger)" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>
      <div className="record-card-total">
        <strong className="font-mono">{amount}</strong>
        {badge}
      </div>
      <dl className="record-card-metrics">
        {metrics.map(({ label, value }) => (
          <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {!actionsInHeader && (<footer className="record-card-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={t("Edit {0}", { "0": actionLabel ?? '' })}>
          <Edit2 size={14} /> {t("Edit")}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDelete} aria-label={t("Delete {0}", { "0": actionLabel ?? '' })}>
          <Trash2 size={14} color="var(--vault-danger)" /> {t("Delete")}
        </button>
      </footer>)}
    </article>
  )
}
