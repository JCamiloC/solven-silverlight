'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileText } from 'lucide-react'
import { useClients } from '@/hooks/use-clients'
import { useMaintenanceReport, useExportMaintenanceWord } from '@/hooks/use-maintenance-reports'
import { MaintenanceReportFilters } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ReportType = 'mantenimiento' | null

export default function ReportsPage() {
  const currentDate = new Date()
  const pad = (value: number) => value.toString().padStart(2, '0')
  const defaultEndDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`
  const defaultStartDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-01`

  const [selectedReport, setSelectedReport] = useState<ReportType>(null)

  const [filters, setFilters] = useState<MaintenanceReportFilters>({
    reportType: 'hardware',
    clientId: '',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  })

  const [shouldFetch, setShouldFetch] = useState(false)

  const { data: clients } = useClients()
  const { data: reportData, isLoading, isFetching } = useMaintenanceReport(filters, shouldFetch)
  const exportWord = useExportMaintenanceWord()

  const selectedClient = clients?.find(c => c.id === filters.clientId)

  const handleGenerateReport = () => {
    if (!filters.clientId) return
    setShouldFetch(true)
  }

  const handleExportWord = () => {
    if (!reportData || !selectedClient) return
    exportWord.mutate({
      rows: reportData,
      clientName: selectedClient.name,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
  }

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">
            Genera reportes personalizados según tus necesidades
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Reporte</CardTitle>
            <CardDescription>
              Selecciona el tipo de reporte que deseas generar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === 'mantenimiento' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setSelectedReport('mantenimiento')
                  setShouldFetch(false)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <h3 className="font-semibold text-lg">Reporte de Mantenimiento</h3>
                    <p className="text-sm text-muted-foreground">
                      Genera reportes de mantenimientos realizados por cliente y período
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-not-allowed opacity-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Otros Reportes</h3>
                    <p className="text-sm text-muted-foreground">
                      Próximamente disponibles
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {selectedReport === 'mantenimiento' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Reporte</CardTitle>
                <CardDescription>
                  Selecciona el módulo, cliente y rango de fechas para generar el informe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Módulo</Label>
                    <Select
                      value={filters.reportType}
                      onValueChange={(value: any) => {
                        setFilters({ ...filters, reportType: value })
                        setShouldFetch(false)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hardware">Hardware</SelectItem>
                        <SelectItem value="software" disabled>Software (Próximamente)</SelectItem>
                        <SelectItem value="accesos" disabled>Accesos (Próximamente)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={filters.clientId}
                      onValueChange={(value) => {
                        setFilters({ ...filters, clientId: value })
                        setShouldFetch(false)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha inicio</Label>
                    <Input
                      type="date"
                      value={filters.startDate ?? ''}
                      max={filters.endDate ?? ''}
                      onChange={(e) => {
                        setFilters({ ...filters, startDate: e.target.value })
                        setShouldFetch(false)
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha fin</Label>
                    <Input
                      type="date"
                      value={filters.endDate ?? ''}
                      min={filters.startDate ?? ''}
                      onChange={(e) => {
                        setFilters({ ...filters, endDate: e.target.value })
                        setShouldFetch(false)
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={!filters.clientId || !filters.startDate || !filters.endDate || isLoading || isFetching}
                  >
                    {(isLoading || isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generar Reporte
                  </Button>

                  {reportData && reportData.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleExportWord}
                      disabled={exportWord.isPending}
                    >
                      {exportWord.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Exportar Word
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {reportData && reportData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados del Reporte</CardTitle>
                  <CardDescription>
                    {reportData.length} registro(s) encontrado(s) para {selectedClient?.name} entre {filters.startDate} y {filters.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Procesador</TableHead>
                          <TableHead>RAM</TableHead>
                          <TableHead>Disco</TableHead>
                          <TableHead>Pantalla</TableHead>
                          <TableHead>Office</TableHead>
                          <TableHead>Antivirus</TableHead>
                          <TableHead>S.O.</TableHead>
                          <TableHead className="min-w-[200px]">Detalle</TableHead>
                          <TableHead className="min-w-[220px]">Acción recomendada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-medium">{row.rowNumber}</TableCell>
                            <TableCell>{row.usuario}</TableCell>
                            <TableCell>{row.equipoNombre}</TableCell>
                            <TableCell>{row.tipo}</TableCell>
                            <TableCell>{row.procesador}</TableCell>
                            <TableCell>{row.ram}</TableCell>
                            <TableCell>{row.disco}</TableCell>
                            <TableCell>{row.tipoPantalla}</TableCell>
                            <TableCell>{row.office}</TableCell>
                            <TableCell>{row.antivirus}</TableCell>
                            <TableCell>{row.sistemaOperativo}</TableCell>
                            <TableCell className="max-w-[300px] truncate" title={row.detalleSeguimiento}>
                              {row.detalleSeguimiento}
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate" title={row.accionRecomendada}>
                              {row.accionRecomendada}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportData && reportData.length === 0 && shouldFetch && !isLoading && (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center text-muted-foreground">
                    <p>No se encontraron registros de mantenimiento para este cliente en el rango de fechas seleccionado.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
