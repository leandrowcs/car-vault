export const DEFAULT_EXPENSE_CATEGORIES = [
  'Insurance',
  'Registration',
  'Parking',
  'Tolls',
  'Car Wash',
  'Accessories',
  'Fines',
  'Taxes',
  'Financing',
  'Other'
] as const

export type ExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number] | string

export interface Expense {
  id: string
  vehicleId: string
  date: string
  category: ExpenseCategory
  amount: number
  odometer?: number
  description: string
  vendor?: string
  receiptUrl?: string
  notes?: string
  createdAt: string
}

