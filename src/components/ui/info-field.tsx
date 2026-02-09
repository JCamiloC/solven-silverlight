import { Label } from '@/components/ui/label'

interface InfoFieldProps {
  label: string
  value: string | number | undefined | null
  className?: string
}

/**
 * Componente para mostrar campos de información en modo lectura
 * Usado principalmente en vistas de cliente
 */
export function InfoField({ label, value, className }: InfoFieldProps) {
  return (
    <div className={className}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm font-medium">
        {value !== null && value !== undefined && value !== '' ? value : '-'}
      </p>
    </div>
  )
}
