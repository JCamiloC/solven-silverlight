'use client'

import { HardwareAsset } from '@/types'
import { useHardwareAnalytics } from '@/hooks/use-hardware-analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Computer,
  TrendingUp,
  Wrench,
  Archive,
  AlertTriangle,
  Calendar,
  MapPin,
  Building2,
  Monitor,
  ShieldAlert,
  Clock,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface HardwareReportProps {
  assets: HardwareAsset[]
  clientName?: string
}

export function HardwareReport({ assets, clientName }: HardwareReportProps) {
  const analytics = useHardwareAnalytics(assets)

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activos',
      maintenance: 'En Mantenimiento',
      retired: 'Retirados',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      maintenance: 'bg-yellow-500',
      retired: 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Reporte de Hardware{clientName ? ` - ${clientName}` : ''}
        </h2>
        <p className="text-muted-foreground">
          Análisis detallado y métricas del inventario de hardware
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipos</CardTitle>
            <Computer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">Inventario total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.activeAssets}</div>
            <p className="text-xs text-muted-foreground">
              {((analytics.metrics.activeAssets / analytics.metrics.totalAssets) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Mantenimiento</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.maintenanceAssets}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas Registradas</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.uniqueAreas}</div>
            <p className="text-xs text-muted-foreground">Áreas únicas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(analytics.alerts.warrantyExpiringSoon.length > 0 ||
        analytics.alerts.expiredWarranty.length > 0 ||
        analytics.alerts.oldEquipment.length > 0 ||
        analytics.criticalEquipment.length > 0) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Alertas y Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.alerts.warrantyExpiringSoon.length > 0 && (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Garantías por vencer</AlertTitle>
                <AlertDescription>
                  {analytics.alerts.warrantyExpiringSoon.length} equipo(s) con garantía próxima a vencer (menos de 30 días)
                </AlertDescription>
              </Alert>
            )}

            {analytics.alerts.expiredWarranty.length > 0 && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Garantías vencidas</AlertTitle>
                <AlertDescription>
                  {analytics.alerts.expiredWarranty.length} equipo(s) con garantía ya vencida
                </AlertDescription>
              </Alert>
            )}

            {analytics.alerts.oldEquipment.length > 0 && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>Equipos antiguos</AlertTitle>
                <AlertDescription>
                  {analytics.alerts.oldEquipment.length} equipo(s) con más de 5 años de antigüedad. Considere actualización.
                </AlertDescription>
              </Alert>
            )}

            {analytics.criticalEquipment.length > 0 && (
              <Alert>
                <Wrench className="h-4 w-4" />
                <AlertTitle>Equipos críticos</AlertTitle>
                <AlertDescription>
                  {analytics.criticalEquipment.length} equipo(s) actualmente en mantenimiento
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribución por Estado */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Estado</CardTitle>
          <CardDescription>Estado actual de los equipos en inventario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analytics.statusDistribution.map((item) => (
            <div key={item.status} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                <span className="text-sm text-muted-foreground">
                  {item.count} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>Categorías de equipos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.typeDistribution.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Marcas */}
        <Card>
          <CardHeader>
            <CardTitle>Top Marcas</CardTitle>
            <CardDescription>Marcas más utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.brandDistribution.slice(0, 8).map((item) => (
                <div key={item.brand} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.brand}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vencimientos Próximos */}
      <Card>
        <CardHeader>
          <CardTitle>Vencimientos Próximos</CardTitle>
          <CardDescription>Próximas 5 fechas de vencimiento de licencias y software</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.upcomingExpirations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay vencimientos registrados con licencia activa</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.upcomingExpirations.map((expiry, index) => {
                  const isExpired = expiry.daysUntilExpiry < 0
                  const isExpiringSoon = expiry.daysUntilExpiry >= 0 && expiry.daysUntilExpiry <= 30
                  
                  return (
                    <TableRow key={`${expiry.assetId}-${expiry.type}-${index}`}>
                      <TableCell className="font-medium">{expiry.assetName}</TableCell>
                      <TableCell>{expiry.type}</TableCell>
                      <TableCell>
                        {format(new Date(expiry.expirationDate), 'PP', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="destructive">Vencido</Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {expiry.daysUntilExpiry} días
                          </Badge>
                        ) : (
                          <Badge variant="default">{expiry.daysUntilExpiry} días</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución por Sede */}
        {analytics.sedeAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Distribución por Sede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.sedeAnalysis.map((item) => (
                  <div key={item.sede} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.sede}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribución por Área */}
        {analytics.areaAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Distribución por Área
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.areaAnalysis.slice(0, 8).map((item) => (
                  <div key={item.area} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.area}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sistemas Operativos */}
      {analytics.osAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Sistemas Operativos
            </CardTitle>
            <CardDescription>Distribución de SO instalados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.osAnalysis.map((item) => (
                <div key={item.os} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.os}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {((item.count / analytics.metrics.totalAssets) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* MS Office */}
        {analytics.officeAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                MS Office
              </CardTitle>
              <CardDescription>Distribución de versiones de Office</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.officeAnalysis.map((item) => (
                  <div key={item.office} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.office}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.count}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {((item.count / analytics.metrics.totalAssets) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Antivirus */}
        {analytics.antivirusAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Antivirus
              </CardTitle>
              <CardDescription>Distribución de software antivirus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.antivirusAnalysis.map((item) => (
                  <div key={item.antivirus} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.antivirus}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.count}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {((item.count / analytics.metrics.totalAssets) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabla de Garantías Próximas a Vencer */}
      {analytics.alerts.warrantyExpiringSoon.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Garantías Próximas a Vencer</CardTitle>
            <CardDescription>Equipos con garantía que vence en menos de 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead>Vencimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.alerts.warrantyExpiringSoon.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.serial_number}</TableCell>
                    <TableCell>
                      {asset.warranty_expiry &&
                        format(new Date(asset.warranty_expiry), 'PP', { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Equipos Críticos */}
      {analytics.criticalEquipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos en Mantenimiento</CardTitle>
            <CardDescription>Equipos que requieren atención actualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Ubicación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.criticalEquipment.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.persona_responsable || '-'}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
