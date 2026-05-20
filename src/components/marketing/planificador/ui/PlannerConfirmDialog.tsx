'use client'

import { AlertTriangle } from 'lucide-react'
import { PlannerDialog } from '@/components/marketing/planificador/ui/PlannerDialog'
import { PlannerModalFooter } from '@/components/marketing/planificador/ui/PlannerForm'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
}

export function PlannerConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  loading,
  variant = 'danger',
}: Props) {
  return (
    <PlannerDialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={message}
      size="md"
      icon={<AlertTriangle className="h-5 w-5" />}
      footer={
        <PlannerModalFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmLabel={confirmLabel}
          confirmLoading={loading}
          confirmVariant={variant}
        />
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </PlannerDialog>
  )
}
