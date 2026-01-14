'use client'

import { useQuery } from '@tanstack/react-query'
import { hardwareService } from '@/services/hardware'
import { HardwareUpgrade } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cpu, HardDrive, MemoryStick, Clock, User, FileText, History } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

interface HardwareUpgradesHistoryProps {
  hardwareId: string
}

export function HardwareUpgradesHistory({ hardwareId }: HardwareUpgradesHistoryProps) {
  const { data: upgrades, isLoading, error } = useQuery({
    queryKey: ['hardware-upgrades', hardwareId],
    queryFn: () => hardwareService.getUpgrades(hardwareId),
    enabled: !!hardwareId,
  })

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'procesador':
        return <Cpu className="h-4 w-4" />
      case 'memoria_ram':
        return <MemoryStick className="h-4 w-4" />
      case 'disco_duro':
        return <HardDrive className="h-4 w-4" />
      default:
        return null
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'procesador':
        return 'Procesador'
      case 'memoria_ram':
        return 'Memoria RAM'
      case 'disco_duro':
        return 'Disco Duro'
      default:
        return field
    }
  }

  const renderUpgradeCard = (upgrade: HardwareUpgrade) => {
    return (
      <Card key={upgrade.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Actualización Física
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                {format(new Date(upgrade.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              {upgrade.changed_fields.length} {upgrade.changed_fields.length === 1 ? 'cambio' : 'cambios'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cambios realizados */}
          <div className="space-y-3">
            {upgrade.changed_fields.map((field) => {
              const oldValue = upgrade[`previous_${field}` as keyof HardwareUpgrade] as string
              const newValue = upgrade[`new_${field}` as keyof HardwareUpgrade] as string
              
              return (
                <div key={field} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {getFieldIcon(field)}
                    {getFieldLabel(field)}
                  </div>
                  <div className="pl-6 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Anterior:</span>
                      <span className="line-through text-red-600">
                        {oldValue || 'No especificado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Nuevo:</span>
                      <span className="font-medium text-green-600">
                        {newValue || 'No especificado'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Razón y notas */}
          {(upgrade.update_reason || upgrade.notes) && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                {upgrade.update_reason && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Razón: </span>
                      <span className="text-muted-foreground">{upgrade.update_reason}</span>
                    </div>
                  </div>
                )}
                {upgrade.notes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">Notas: </span>
                      <span className="text-muted-foreground">{upgrade.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Usuario que realizó el cambio */}
          {upgrade.updater && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>
                  Actualizado por: {upgrade.updater.first_name} {upgrade.updater.last_name}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Actualizaciones Físicas</CardTitle>
          <CardDescription>Cargando historial...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Actualizaciones Físicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Error al cargar el historial
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!upgrades || upgrades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Actualizaciones Físicas
          </CardTitle>
          <CardDescription>
            Registro de cambios en procesador, memoria RAM y disco duro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay actualizaciones físicas registradas
            </p>
            <p className="text-xs text-muted-foreground">
              Las actualizaciones se registrarán automáticamente cuando cambies el procesador, RAM o disco duro
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Actualizaciones Físicas
        </CardTitle>
        <CardDescription>
          {upgrades.length} {upgrades.length === 1 ? 'actualización registrada' : 'actualizaciones registradas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {upgrades.map(renderUpgradeCard)}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
