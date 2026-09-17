import { useTranslation } from '../../hooks/useTranslation'
import React from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = true,
}) => {
  const t = useTranslation()
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t(title)}
      maxWidth="420px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {t(confirmLabel)}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--vault-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
        {t(message)}
      </p>
    </Modal>
  )
}

