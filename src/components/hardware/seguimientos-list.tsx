'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useGetFollowUps } from '@/hooks/use-hardware'
import { format } from 'date-fns'

interface SeguimientosListProps {
  hardwareId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SeguimientosList({ hardwareId, open, onOpenChange }: SeguimientosListProps) {
  const { data, isLoading, refetch } = useGetFollowUps(hardwareId)

  useEffect(() => {
    if (open) refetch()
  }, [open, refetch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seguimientos</DialogTitle>
        </DialogHeader>
        <div>
          {isLoading ? (
            <div>Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Técnico asignado</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{format(new Date(s.fecha_registro), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{translateTipo(s.tipo)}</TableCell>
                    <TableCell>{s.creator ? `${s.creator.first_name || ''} ${s.creator.last_name || ''}`.trim() : 'Sin asignar'}</TableCell>
                    <TableCell>{s.detalle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function translateTipo(tipo: string) {
  const translations: Record<string, string> = {
    mantenimiento_programado: 'Mantenimiento Programado',
    mantenimiento_no_programado: 'Mantenimiento No Programado',
    soporte_remoto: 'Soporte Remoto',
    soporte_en_sitio: 'Soporte en Sitio',
  }

  return translations[tipo] || tipo
}
