import { getLanguage } from '../services/language'
import { useTranslation } from '../hooks/useTranslation'
import React, { useState, useMemo } from 'react'
import {
  Receipt,
  Plus,
  DollarSign,
  Search,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { formatCurrency, formatDate } from '../utils/formatters'
import { RecordCard } from '../components/common/RecordCard'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { Expense } from '../types/expense'

interface ExpensesViewProps {
  onAddExpense: () => void
  onEditExpense: (expense: Expense) => void
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onAddExpense,
  onEditExpense,
}) => {
  const t = useTranslation()
  const { activeVehicle, activeExpenses, deleteExpense, settings } = useCarVault()

  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Unique categories in active expenses
  const categories = useMemo(() => {
    const set = new Set<string>()
    activeExpenses.forEach((e) => set.add(e.category))
    return Array.from(set).sort()
  }, [activeExpenses])

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return activeExpenses.filter((e) => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchQuery =
        !query ||
        e.description.toLowerCase().includes(query) ||
        (e.vendor && e.vendor.toLowerCase().includes(query)) ||
        e.category.toLowerCase().includes(query)
      return matchCat && matchQuery
    })
  }, [activeExpenses, selectedCategory, searchQuery])

  // Total amount
  const totalAmount = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
    [filteredExpenses]
  )

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <Receipt className="empty-state-icon" />
        <h3 className="empty-state-title">{t("Select or Add a Vehicle First")}</h3>
        <p className="empty-state-desc">
          {t("You must have an active vehicle in your garage to record expenses.")}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {/* Header */}
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{t("Vehicle Expenses")}</h2>
          <p className="card-subtitle">
            {t("Insurance, registration, tolls, parking, and miscellaneous costs")}
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddExpense}>
          <Plus size={16} /> {t("Add Expense")}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid-metrics">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>{t("Filtered Expenses")}</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalAmount, settings.currency)}
          </div>
          <div className="metric-subtext">
            {filteredExpenses.length} {t("records matching filters")}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>{t("All-Time Expenses")}</span>
            <Receipt className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(
              activeExpenses.reduce((sum, e) => sum + e.amount, 0),
              settings.currency
            )}
          </div>
          <div className="metric-subtext">{activeExpenses.length} {t("total expense entries")}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--vault-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--vault-border)',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory('all')}
          >
            {t("All Categories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {t(cat)}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, width: '100%', maxWidth: '320px' }}>
          <Search size={16} color="var(--vault-text-muted)" />
          <input
            type="text"
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '13px' }}
            placeholder={t("Search expenses...")}
            aria-label={t("Search expenses")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <section aria-label={t("Expense history")}>
        <div className="record-history-heading">
          <h3 className="card-title">{t("Expense History")}</h3>
          <span className="badge badge-slate">{filteredExpenses.length} {t("records")}</span>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="record-empty">
            {activeExpenses.length === 0 ? t("No expenses logged yet for this vehicle.") : t("No expenses found matching the selected criteria.")}
          </div>
        ) : (
          <div className="record-grid">
            {filteredExpenses.map((expense) => (
              <RecordCard
                key={expense.id}
                icon={<Receipt size={20} />}
                title={expense.description || (t(expense.category))}
                date={formatDate(expense.date, settings.dateFormat)}
                amount={formatCurrency(expense.amount, settings.currency)}
                badge={<span className="badge badge-slate">{t(expense.category)}</span>}
                metrics={[
                  { label: 'Vendor', value: expense.vendor || '—' },
                  { label: 'Odometer', value: expense.odometer != null ? `${expense.odometer.toLocaleString(getLanguage())} km` : '—' },
                ]}
                actionLabel={t("expense {0} on {1}", { "0": expense.description ?? '', "1": formatDate(expense.date, settings.dateFormat) ?? '' })}
                onEdit={() => onEditExpense(expense)}
                onDelete={() => setExpenseToDelete(expense)}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title={t("Delete Expense")}
        message={t("Are you sure you want to delete the expense \"{0}\"?", { "0": expenseToDelete?.description ?? '' })}
        confirmLabel={t("Delete Expense")}
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id)
            setExpenseToDelete(null)
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  )
}
