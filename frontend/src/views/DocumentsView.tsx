import React, { useState } from 'react'
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react'
import { useCarVault } from '../context/CarVaultContext'
import { formatDate } from '../utils/formatters'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import type { VehicleDocument } from '../types/document'

interface DocumentsViewProps {
  onAddDocument: () => void
  onEditDocument: (doc: VehicleDocument) => void
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  onAddDocument,
  onEditDocument,
}) => {
  const { activeVehicle, activeDocuments, deleteDocument, settings } = useCarVault()

  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null)

  if (!activeVehicle) {
    return (
      <div className="empty-state">
        <FileText className="empty-state-icon" />
        <h3 className="empty-state-title">Select or Add a Vehicle First</h3>
        <p className="empty-state-desc">
          You must have an active vehicle in your garage to record documents.
        </p>
      </div>
    )
  }

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null
    const expTime = new Date(expiryDate).getTime()
    const nowTime = new Date().getTime()
    const daysLeft = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
      return <span className="badge badge-rose">Expired ({Math.abs(daysLeft)}d ago)</span>
    }
    if (daysLeft <= 30) {
      return <span className="badge badge-amber">Expires in {daysLeft} days</span>
    }
    return <span className="badge badge-emerald">Valid</span>
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
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Vehicle Documents & Records</h2>
          <p className="card-subtitle">
            Ownership, insurance policies, safety inspections, warranties, and receipts
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={onAddDocument}>
          <Plus size={16} /> Record Document
        </button>
      </div>

      {activeDocuments.length === 0 ? (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">No Documents Tracked</h3>
          <p className="empty-state-desc">
            Keep references for your vehicle ownership, annual insurance renewal policy, or warranty numbers in one safe place.
          </p>
          <button type="button" className="btn btn-primary" onClick={onAddDocument}>
            <Plus size={16} /> Add First Document
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '18px' }}>
          {activeDocuments.map((doc) => {
            const expiryBadge = getExpiryStatus(doc.expiryDate)

            return (
              <Card
                key={doc.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-slate">{doc.category}</span>
                      {expiryBadge}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--vault-text)' }}>
                      {doc.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => onEditDocument(doc)}
                      title="Edit document"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={() => setDocToDelete(doc)}
                      title="Delete document"
                    >
                      <Trash2 size={13} color="var(--vault-danger)" />
                    </button>
                  </div>
                </div>

                {doc.documentNumber && (
                  <div
                    style={{
                      background: 'var(--vault-surface-2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ color: 'var(--vault-text-muted)', display: 'block', fontSize: '11px' }}>
                      Document / Policy #
                    </span>
                    <strong className="font-mono" style={{ color: 'var(--vault-primary)' }}>
                      {doc.documentNumber}
                    </strong>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: 'var(--vault-text-secondary)' }}>
                  {doc.issueDate && (
                    <div>
                      <span>Issued: </span>
                      <strong className="font-mono">{formatDate(doc.issueDate, settings.dateFormat)}</strong>
                    </div>
                  )}

                  {doc.expiryDate && (
                    <div>
                      <span>Expires: </span>
                      <strong className="font-mono">{formatDate(doc.expiryDate, settings.dateFormat)}</strong>
                    </div>
                  )}
                </div>

                {doc.notes && (
                  <div style={{ fontSize: '12.5px', color: 'var(--vault-text-muted)', borderTop: '1px solid rgba(51, 65, 85, 0.4)', paddingTop: '8px' }}>
                    {doc.notes}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(docToDelete)}
        title="Delete Document Record"
        message={`Are you sure you want to delete the record for "${docToDelete?.title}"?`}
        confirmLabel="Delete Document"
        onConfirm={() => {
          if (docToDelete) {
            deleteDocument(docToDelete.id)
            setDocToDelete(null)
          }
        }}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  )
}
