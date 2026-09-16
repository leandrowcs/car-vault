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
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          You must have an active vehicle in your garage to record expenses.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Vehicle Expenses</h2>
          <p className="card-subtitle">
            Insurance, registration, tolls, parking, and miscellaneous costs
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddExpense}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid-metrics">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Filtered Expenses</span>
            <DollarSign className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(totalAmount, settings.currency)}
          </div>
          <div className="metric-subtext">
            {filteredExpenses.length} records matching filters
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>All-Time Expenses</span>
            <Receipt className="metric-card-icon" />
          </div>
          <div className="metric-value font-mono">
            {formatCurrency(
              activeExpenses.reduce((sum, e) => sum + e.amount, 0),
              settings.currency
            )}
          </div>
          <div className="metric-subtext">{activeExpenses.length} total expense entries</div>
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
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
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
            placeholder="Search expenses..."
            aria-label="Search expenses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <section aria-label="Expense history">
        <div className="record-history-heading">
          <h3 className="card-title">Expense History</h3>
          <span className="badge badge-slate">{filteredExpenses.length} records</span>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="record-empty">
            {activeExpenses.length === 0
              ? 'No expenses logged yet for this vehicle.'
              : 'No expenses found matching the selected criteria.'}
          </div>
        ) : (
          <div className="record-grid">
            {filteredExpenses.map((expense) => (
              <RecordCard
                key={expense.id}
                icon={<Receipt size={20} />}
                title={expense.description || expense.category}
                date={formatDate(expense.date, settings.dateFormat)}
                amount={formatCurrency(expense.amount, settings.currency)}
                badge={<span className="badge badge-slate">{expense.category}</span>}
                metrics={[
                  { label: 'Vendor', value: expense.vendor || '—' },
                  { label: 'Odometer', value: expense.odometer != null ? `${expense.odometer.toLocaleString()} km` : '—' },
                ]}
                actionLabel={`expense ${expense.description} on ${formatDate(expense.date, settings.dateFormat)}`}
                onEdit={() => onEditExpense(expense)}
                onDelete={() => setExpenseToDelete(expense)}
              />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense"
        message={`Are you sure you want to delete the expense "${expenseToDelete?.description}"?`}
        confirmLabel="Delete Expense"
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
