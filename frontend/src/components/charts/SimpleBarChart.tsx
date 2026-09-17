import { useTranslation } from '../../hooks/useTranslation'
import React from 'react'
import { formatMonth } from '../../utils/formatters'

interface MonthlyBarItem {
  monthKey?: string
  label: string
  fuel: number
  maintenance: number
  expenses: number
  total: number
}

interface SimpleBarChartProps {
  data: MonthlyBarItem[]
  currency?: string
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
}) => {
  const t = useTranslation()
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--vault-text-muted)' }}>
        {t("No spending history yet to display monthly trend.")}
      </div>
    )
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '16px',
          height: '200px',
          paddingTop: '20px',
          paddingBottom: '24px',
          minWidth: `${data.length * 60}px`,
        }}
      >
        {data.map((item, idx) => {
          const monthLabel = item.monthKey ? formatMonth(item.monthKey, 'short') : item.label
          const totalHeightPercent = (item.total / maxTotal) * 100
          const fuelPercent = item.total > 0 ? (item.fuel / item.total) * 100 : 0
          const maintPercent = item.total > 0 ? (item.maintenance / item.total) * 100 : 0
          const expPercent = item.total > 0 ? (item.expenses / item.total) * 100 : 0

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '6px',
              }}
              title={t("{0}: ${1} (Fuel: ${2}, Maint: ${3}, Other: ${4})", { "0": monthLabel ?? '', "1": item.total.toFixed(2) ?? '', "2": item.fuel.toFixed(2) ?? '', "3": item.maintenance.toFixed(2) ?? '', "4": item.expenses.toFixed(2) ?? '' })}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'DM Mono',
                  color: 'var(--vault-text-secondary)',
                  fontWeight: 600,
                }}
              >
                ${Math.round(item.total)}
              </div>

              {/* Stacked bar container */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '38px',
                  height: `${Math.max(totalHeightPercent, 4)}%`,
                  background: 'var(--vault-surface-2)',
                  borderRadius: '4px 4px 0 0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                }}
              >
                {/* Fuel portion (Amber) */}
                <div
                  style={{
                    height: `${fuelPercent}%`,
                    background: 'var(--vault-primary)',
                  }}
                />
                {/* Maintenance portion (Blue) */}
                <div
                  style={{
                    height: `${maintPercent}%`,
                    background: 'var(--vault-info)',
                  }}
                />
                {/* Other Expenses portion (Slate/Purple) */}
                <div
                  style={{
                    height: `${expPercent}%`,
                    background: '#a855f7',
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vault-text-muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {monthLabel}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          paddingTop: '8px',
          borderTop: '1px solid var(--vault-border)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'var(--vault-primary)',
            }}
          />
          <span>{t("Fuel")}</span>
        </div>
        <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'var(--vault-info)',
            }}
          />
          <span>{t("Maintenance")}</span>
        </div>
        <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: '#a855f7',
            }}
          />
          <span>{t("Other Expenses")}</span>
        </div>
      </div>
    </div>
  )
}
