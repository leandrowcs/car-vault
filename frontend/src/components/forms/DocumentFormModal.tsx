import React, { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import {
  DEFAULT_DOCUMENT_CATEGORIES,
  type VehicleDocument,
} from '../../types/document'
import { useCarVault } from '../../context/CarVaultContext'

interface DocumentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (doc: Omit<VehicleDocument, 'id' | 'createdAt'>) => void
  initialData?: VehicleDocument | null
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { activeVehicle } = useCarVault()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('Registration')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setCategory(initialData.category)
      setDocumentNumber(initialData.documentNumber || '')
      setIssueDate(initialData.issueDate ? initialData.issueDate.slice(0, 10) : '')
      setExpiryDate(initialData.expiryDate ? initialData.expiryDate.slice(0, 10) : '')
      setNotes(initialData.notes || '')
    } else {
      setTitle('')
      setCategory('Registration')
      setDocumentNumber('')
      setIssueDate('')
      setExpiryDate('')
      setNotes('')
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVehicle || !title) return

    onSave({
      vehicleId: activeVehicle.id,
      title,
      category,
      documentNumber: documentNumber || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Document' : 'Record Vehicle Document'}
      maxWidth="520px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="document-form" className="btn btn-primary">
            {initialData ? 'Update Record' : 'Save Document'}
          </button>
        </>
      }
    >
      <form id="document-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Document Title *</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder="e.g. Ontario Vehicle Ownership, Intact Insurance Policy"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DEFAULT_DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Document / Policy #</label>
            <input
              type="text"
              className="form-input font-mono"
              placeholder="e.g. POL-99201"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Issue Date</label>
            <input
              type="date"
              className="form-input"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes / Storage Location</label>
          <textarea
            className="form-textarea"
            placeholder="Physical location (glove compartment), policy coverage details, agent contact..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}

