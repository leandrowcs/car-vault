import React, { useState, useMemo } from 'react'
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Gauge,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { evaluateReminderStatus } from '../utils/calculations'
import { formatDate } from '../utils/formatters'
import { ReminderBadge } from '../components/common/StatBadge'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { Reminder } from '../types/reminder'

interface RemindersViewProps {
  onAddReminder: () => void
  onEditReminder: (reminder: Reminder) => void
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  onAddReminder,
  onEditReminder,
}) => {
  const {
    activeVehicle,
    activeReminders,
    toggleReminderComplete,
    deleteReminder,
    settings,
  } = useCarVault()

  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null)

  const evaluated = useMemo(() => {
    return activeReminders.map((r) => ({
      ...r,
      status: evaluateReminderStatus(r, activeVehicle?.currentOdometer),
    }))
  }, [activeReminders, activeVehicle?.currentOdometer])

  const overdueList = evaluated.filter((r) => r.status === 'overdue' && !r.isCompleted)
  const dueSoonList = evaluated.filter((r) => r.status === 'due-soon' && !r.isCompleted)
  const upcomingList = evaluated.filter((r) => r.status === 'upcoming' && !r.isCompleted)
  const completedList = evaluated.filter((r) => r.isCompleted)

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Bell className="empty-state-icon" />
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          You must have an active vehicle in your garage to set service reminders.
        </p>
      </div>
    )
  }

  const renderReminderCard = (reminder: (typeof evaluated)[0]) => {
    const isCompleted = reminder.isCompleted
    const targetOdo = reminder.targetOdometer
    const currentOdo = activeVehicle.currentOdometer
    const remainingKm =
      targetOdo !== undefined ? targetOdo - currentOdo : undefined

    return (
      <Card
        key={reminder.id}
        style={{
          opacity: isCompleted ? 0.65 : 1,
          borderLeft: `4px solid ${
            reminder.status === 'overdue'
              ? 'var(--vault-danger)'
              : reminder.status === 'due-soon'
              ? 'var(--vault-warning)'
              : isCompleted
              ? 'var(--vault-success)'
              : 'var(--vault-border)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ReminderBadge status={reminder.status} />
              {reminder.category && (
                <span className="badge badge-slate">{reminder.category}</span>
              )}
            </div>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--vault-text)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {reminder.title}
            </h4>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => toggleReminderComplete(reminder.id)}
              title={isCompleted ? 'Mark as active' : 'Mark as completed'}
            >
              {isCompleted ? (
                <>
                  <RotateCcw size={13} /> Reopen
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} /> Complete
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => onEditReminder(reminder)}
              title="Edit reminder"
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => setReminderToDelete(reminder)}
              title="Delete reminder"
            >
              <Trash2 size={13} color="var(--vault-danger)" />
            </button>
          </div>
        </div>

        {/* Details & Due Status */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '12px',
            fontSize: '13px',
            color: 'var(--vault-text-secondary)',
          }}
        >
          {reminder.dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--vault-primary)" />
              <span>Due: {formatDate(reminder.dueDate, settings.dateFormat)}</span>
            </div>
          )}

          {targetOdo !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gauge size={14} color="var(--vault-primary)" />
              <span>
                Target: {targetOdo.toLocaleString()} km
                {remainingKm !== undefined && !isCompleted && (
                  <strong
                    style={{
                      marginLeft: '4px',
                      color:
                        remainingKm <= 0
                          ? 'var(--vault-danger)'
                          : remainingKm <= 500
                          ? 'var(--vault-warning)'
                          : 'var(--vault-text)',
                    }}
                  >
                    ({remainingKm <= 0 ? `${Math.abs(remainingKm).toLocaleString()} km overdue` : `${remainingKm.toLocaleString()} km left`})
                  </strong>
                )}
              </span>
            </div>
          )}
        </div>

        {reminder.notes && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '12.5px',
              color: 'var(--vault-text-muted)',
              borderTop: '1px solid rgba(51, 65, 85, 0.5)',
              paddingTop: '8px',
            }}
          >
            {reminder.notes}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Service Reminders</h2>
          <p className="card-subtitle">
            Current vehicle mileage: <strong>{activeVehicle.currentOdometer.toLocaleString()} km</strong>
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddReminder}>
          <Plus size={16} /> Set Reminder
        </button>
      </div>

      {activeReminders.length === 0 ? (
        <div className="empty-state">
          <Bell className="empty-state-icon" />
          <h3 className="empty-state-title">No Reminders Scheduled</h3>
          <p className="empty-state-desc">
            Set reminders for oil changes, tire rotations, inspections, or registration renewals by date, mileage, or both.
          </p>
          <button type="button" className="btn btn-primary" onClick={onAddReminder}>
            <Plus size={16} /> Create First Reminder
          </button>
        </div>
      ) : (
        <>
          {/* Overdue section if any */}
          {overdueList.length > 0 && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vault-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Overdue ({overdueList.length})
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {overdueList.map(renderReminderCard)}
              </div>
            </div>
          )}

          {/* Due Soon section */}
          {dueSoonList.length > 0 && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vault-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Due Soon ({dueSoonList.length})
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {dueSoonList.map(renderReminderCard)}
              </div>
            </div>
          )}

          {/* Upcoming section */}
          {upcomingList.length > 0 && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vault-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Upcoming ({upcomingList.length})
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {upcomingList.map(renderReminderCard)}
              </div>
            </div>
          )}

          {/* Completed section */}
          {completedList.length > 0 && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vault-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Completed ({completedList.length})
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {completedList.map(renderReminderCard)}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(reminderToDelete)}
        title="Delete Reminder"
        message={`Are you sure you want to delete the reminder "${reminderToDelete?.title}"?`}
        confirmLabel="Delete Reminder"
        onConfirm={() => {
          if (reminderToDelete) {
            deleteReminder(reminderToDelete.id)
            setReminderToDelete(null)
          }
        }}
        onCancel={() => setReminderToDelete(null)}
      />
    </div>
  )
}

