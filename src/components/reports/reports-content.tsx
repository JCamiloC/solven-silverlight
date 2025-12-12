'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  HardDrive, 
  Monitor, 
  Key,
  Calendar,
  Filter,
  AlertCircle
} from 'lucide-react'
import { 
  useOverviewMetrics, 
  useClientReports, 
  useHardwareMetrics,
  useClientActivityMetrics,
  useExportClientReport,
  useExportOverviewPDF
} from '@/hooks/use-reports'
import { ReportFilters } from '@/lib/services/reports'
import { format, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'

// Componentes de gráficos
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface ReportsContentProps {
  // Props pueden ser agregadas en el futuro
}

export function ReportsContent({}: ReportsContentProps = {}) {
  const { hasRole, loading } = useAuth()
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'month'
  })
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Queries
  const { data: overviewMetrics, isLoading: overviewLoading } = useOverviewMetrics()
  const { data: clientReports, isLoading: clientReportsLoading } = useClientReports(filters)
  const { data: hardwareMetrics, isLoading: hardwareLoading } = useHardwareMetrics(filters)
  const { data: clientActivity, isLoading: activityLoading } = useClientActivityMetrics()

  // Mutations
  const exportClientReport = useExportClientReport()
  const exportOverviewPDF = useExportOverviewPDF()

  // Permisos
  const canViewReports = hasRole(['administrador', 'lider_soporte'])
  const canExport = hasRole(['administrador', 'lider_soporte'])

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <BarChart3 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Solo los administradores y líderes de soporte pueden acceder a los reportes.
          </p>
        </div>
      </div>
    )
  }

  const handlePeriodChange = (period: string) => {
    const today = new Date()
    let startDate: Date
    let endDate = today

    switch (period) {
      case 'week':
        startDate = subDays(today, 7)
        break
      case 'month':
        startDate = subMonths(today, 1)
        break
      case 'quarter':
        startDate = subMonths(today, 3)
        break
      case 'year':
        startDate = subMonths(today, 12)
        break
      default:
        startDate = subMonths(today, 1)
    }

    setFilters({
      ...filters,
      period: period as ReportFilters['period'],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })
  }

  const handleExportClientReport = (clientId: string, clientName: string) => {
    exportClientReport.mutate({ clientId, clientName })
  }

  const handleExportOverview = () => {
    exportOverviewPDF.mutate()
  }

  // Preparar datos para gráficos
  const pieChartData = overviewMetrics ? [
    { name: 'Hardware', value: overviewMetrics.activeHardware },
    { name: 'Software', value: overviewMetrics.activeLicenses },
    { name: 'Credenciales', value: overviewMetrics.totalCredentials }
  ] : []

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Análisis y métricas del sistema de mesa de ayuda
          </p>
        </div>
        
        {canExport && (
          <div className="flex gap-2">
            <Button
              onClick={handleExportOverview}
              disabled={exportOverviewPDF.isPending}
              variant="outline"
            >
              <FileText className="h-4 w-4 mr-2" />
              {exportOverviewPDF.isPending ? 'Generando...' : 'Exportar PDF'}
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filters.period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="clients">Reportes por Cliente</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen General */}
        <TabsContent value="overview" className="space-y-6">
          {/* Métricas Principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                ) : (
                  <div className="text-2xl font-bold">{overviewMetrics?.totalClients || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hardware Activo</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                ) : (
                  <div className="text-2xl font-bold">{overviewMetrics?.activeHardware || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Licencias Activas</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                ) : (
                  <div className="text-2xl font-bold">{overviewMetrics?.activeLicenses || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credenciales</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-7 bg-muted animate-pulse rounded"></div>
                ) : (
                  <div className="text-2xl font-bold">
                    {hasRole(['administrador']) ? (overviewMetrics?.totalCredentials || 0) : '***'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Distribución de Recursos */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Recursos</CardTitle>
              <CardDescription>
                Distribución actual de recursos por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Reportes por Cliente */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes por Cliente</CardTitle>
              <CardDescription>
                Información detallada de recursos por cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientReportsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {clientReports?.map((report) => (
                    <div key={report.client.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{report.client.name}</h3>
                          {report.client.email && (
                            <p className="text-sm text-muted-foreground">{report.client.email}</p>
                          )}
                        </div>
                        {canExport && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportClientReport(report.client.id, report.client.name)}
                            disabled={exportClientReport.isPending}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Hardware</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Total: {report.hardware.total}</Badge>
                            <Badge variant="default">Activo: {report.hardware.active}</Badge>
                            {report.hardware.maintenance > 0 && (
                              <Badge variant="destructive">Mantenimiento: {report.hardware.maintenance}</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Software</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Total: {report.software.total}</Badge>
                            <Badge variant="default">Activo: {report.software.active}</Badge>
                            {report.software.expiring > 0 && (
                              <Badge variant="destructive">Expirando: {report.software.expiring}</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Credenciales</h4>
                          <div className="flex gap-2">
                            <Badge variant="secondary">
                              Total: {hasRole(['administrador']) ? report.credentials.total : '***'}
                            </Badge>
                            {report.credentials.lastAccess && (
                              <Badge variant="outline">
                                Último: {format(new Date(report.credentials.lastAccess), 'dd/MM', { locale: es })}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {clientReports?.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No se encontraron clientes con los filtros aplicados.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de Hardware</CardTitle>
              <CardDescription>
                Evolución del hardware a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hardwareLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hardwareMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd MMM yyyy', { locale: es })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="active" 
                      stroke="#00C49F" 
                      name="Activo"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="maintenance" 
                      stroke="#FF8042" 
                      name="Mantenimiento"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#8884D8" 
                      name="Total"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Actividad */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actividad por Cliente</CardTitle>
              <CardDescription>
                Distribución de recursos por cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="h-80 bg-muted animate-pulse rounded"></div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={clientActivity?.slice(0, 10)} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="clientName" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hardware" fill="#0088FE" name="Hardware" />
                    <Bar dataKey="software" fill="#00C49F" name="Software" />
                    <Bar dataKey="credentials" fill="#FFBB28" name="Credenciales" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}