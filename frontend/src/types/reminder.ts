export type ReminderType = 'date' | 'mileage' | 'both'
export type ReminderStatus = 'upcoming' | 'due-soon' | 'overdue' | 'completed'

export interface Reminder {
  id: string
  vehicleId: string
  title: string
  type: ReminderType
  dueDate?: string
  dueMileage?: number
  targetOdometer?: number
  category?: string
  notes?: string
  isCompleted: boolean
  completedAt?: string
  createdAt: string
}

