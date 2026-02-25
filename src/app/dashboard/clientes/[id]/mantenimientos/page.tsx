'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { useClient } from '@/hooks/use-clients'
import { useClientPermissions } from '@/hooks/use-client-permissions'
import {
  useClientMaintenances,
  useEnsureClientMaintenanceSchedule,
  useUpdateClientMaintenance,
} from '@/hooks/use-client-maintenances'
import { useAuth } from '@/hooks/use-auth'
import type { ClientMaintenanceStatus } from '@/lib/services/client-maintenances'

const statusLabels: Record<ClientMaintenanceStatus, string> = {
  pendiente: 'Pendiente',
  realizado: 'Realizado',
  reprogramado: 'Reprogramado',
  omitido: 'Omitido',
}

const statusVariant: Record<ClientMaintenanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'secondary',
  realizado: 'default',
  reprogramado: 'outline',
  omitido: 'destructive',
}

export default function ClienteMantenimientosPage() {
  const { id } = useParams()
  const router = useRouter()
  const clientId = typeof id === 'string' ? id : ''
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)

  const { profile } = useAuth()
  const { canCreate, readOnly } = useClientPermissions()
  const { data: client, isLoading: clientLoading } = useClient(clientId)
  const { data: schedules = [], isLoading: scheduleLoading } = useClientMaintenances(clientId, year)

  const ensureSchedule = useEnsureClientMaintenanceSchedule()
  const updateMaintenance = useUpdateClientMaintenance()

  const target = client?.mantenimientos_al_anio || 0

  const stats = useMemo(() => {
    const total = schedules.length
    const done = schedules.filter((row) => row.status === 'realizado').length
    const pending = schedules.filter((row) => row.status === 'pendiente').length
    const compliance = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, pending, compliance }
  }, [schedules])

  const years = [currentYear - 1, currentYear, currentYear + 1]

  const handleGenerateSchedule = async () => {
    try {
      await ensureSchedule.mutateAsync({
        clientId,
        year,
        totalMaintenances: target,
      })
    } catch {
      // El error ya se notifica en el hook (onError)
    }
  }

  const handleUpdate = async (id: string, updates: { expected_date: string; status: ClientMaintenanceStatus; notes?: string | null }) => {
    try {
      await updateMaintenance.mutateAsync({
        id,
        updates,
        clientId,
        year,
        updaterId: profile?.id,
      })
    } catch {
      // El error ya se notifica en el hook (onError)
    }
  }

  if (clientLoading) {
    return (
      <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Cargando mantenimientos..." />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/clientes/${clientId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mantenimientos de {client?.name || 'Cliente'}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Planificación y control anual de mantenimientos programados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Programados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Realizados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{stats.done}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pendientes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cumplimiento</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.compliance}%</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Agenda anual</CardTitle>
            <CardDescription>
              Objetivo anual del cliente: {target} mantenimiento(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:w-56 space-y-2">
                <Label>Año</Label>
                <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!readOnly && (
                <Button
                  onClick={handleGenerateSchedule}
                  disabled={ensureSchedule.isPending || target <= 0}
                  className="w-full sm:w-auto"
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {ensureSchedule.isPending ? 'Generando...' : 'Generar / Completar agenda'}
                </Button>
              )}
            </div>

            {scheduleLoading ? (
              <div className="py-10"><Loading text="Cargando agenda..." /></div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay agenda para {year}. {!readOnly && 'Usa “Generar / Completar agenda”.'}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha esperada</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Realizado</TableHead>
                      <TableHead>Notas</TableHead>
                      {!readOnly && <TableHead className="text-right">Acción</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((row) => (
                      <MaintenanceRow
                        key={row.id}
                        row={row}
                        readOnly={readOnly}
                        onSave={(updates) => handleUpdate(row.id, updates)}
                        saving={updateMaintenance.isPending}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

function MaintenanceRow({
  row,
  readOnly,
  onSave,
  saving,
}: {
  row: {
    expected_date: string
    status: ClientMaintenanceStatus
    notes?: string | null
    completed_at?: string | null
    slot_number: number
  }
  readOnly: boolean
  onSave: (updates: { expected_date: string; status: ClientMaintenanceStatus; notes?: string | null }) => Promise<void>
  saving: boolean
}) {
  const [expectedDate, setExpectedDate] = useState(row.expected_date)
  const [status, setStatus] = useState<ClientMaintenanceStatus>(row.status)
  const [notes, setNotes] = useState(row.notes || '')

  return (
    <TableRow>
      <TableCell className="font-medium">{row.slot_number}</TableCell>
      <TableCell>
        {readOnly ? (
          new Date(`${row.expected_date}T00:00:00`).toLocaleDateString('es-CO')
        ) : (
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-44" />
        )}
      </TableCell>
      <TableCell>
        {readOnly ? (
          <Badge variant={statusVariant[row.status]}>{statusLabels[row.status]}</Badge>
        ) : (
          <Select value={status} onValueChange={(value) => setStatus(value as ClientMaintenanceStatus)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell>
        {row.completed_at ? (
          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            {new Date(row.completed_at).toLocaleDateString('es-CO')}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="min-w-[260px]">
        {readOnly ? (
          <span className="text-sm">{row.notes || '-'}</span>
        ) : (
          <Input
            value={notes}
            placeholder="Notas"
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </TableCell>
      {!readOnly && (
        <TableCell className="text-right">
          <Button
            size="sm"
            onClick={() => onSave({ expected_date: expectedDate, status, notes: notes || null })}
            disabled={saving}
          >
            Guardar
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}
