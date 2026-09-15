export const DEFAULT_DOCUMENT_CATEGORIES = [
  'Insurance',
  'Registration',
  'Inspection',
  'Purchase Documents',
  'Warranty',
  'Service Receipts',
  'Other'
] as const

export type DocumentCategory = (typeof DEFAULT_DOCUMENT_CATEGORIES)[number] | string

export interface VehicleDocument {
  id: string
  vehicleId: string
  title: string
  category: DocumentCategory
  documentNumber?: string
  issueDate?: string
  expiryDate?: string
  notes?: string
  fileReference?: string
  createdAt: string
}

