import { useMemo } from 'react'
import { HardwareAsset } from '@/types'
import { differenceInMonths, differenceInDays, isAfter, isBefore, addMonths } from 'date-fns'

export interface HardwareAnalytics {
  // Distribución por tipo
  typeDistribution: { type: string; count: number; percentage: number }[]
  
  // Distribución por estado
  statusDistribution: { status: string; count: number; percentage: number }[]
  
  // Distribución por marca
  brandDistribution: { brand: string; count: number; percentage: number }[]
  
  // Vencimientos próximos (SO, Office, Antivirus)
  upcomingExpirations: {
    assetName: string
    assetId: string
    type: 'Sistema Operativo' | 'MS Office' | 'Antivirus'
    expirationDate: string
    daysUntilExpiry: number
  }[]
  
  // Alertas
  alerts: {
    warrantyExpiringSoon: HardwareAsset[] // Garantía vence en menos de 30 días
    expiredWarranty: HardwareAsset[] // Garantía ya vencida
    oldEquipment: HardwareAsset[] // Más de 5 años
    noFollowups: HardwareAsset[] // Sin seguimientos (este dato vendría de otra fuente)
  }
  
  // Métricas generales
  metrics: {
    totalAssets: number
    activeAssets: number
    maintenanceAssets: number
    retiredAssets: number
    avgPurchaseDateMonths: number
    assetsWithWarranty: number
    assetsWithoutWarranty: number
    uniqueAreas: number
  }
  
  // Análisis de sedes y áreas
  sedeAnalysis: { sede: string; count: number }[]
  areaAnalysis: { area: string; count: number }[]
  
  // Análisis de software
  osAnalysis: { os: string; count: number }[]
  officeAnalysis: { office: string; count: number }[]
  antivirusAnalysis: { antivirus: string; count: number }[]
  
  // Equipos críticos (en mantenimiento actualmente)
  criticalEquipment: HardwareAsset[]
}

export function useHardwareAnalytics(assets: HardwareAsset[] = []): HardwareAnalytics {
  return useMemo(() => {
    if (!assets || assets.length === 0) {
      return getEmptyAnalytics()
    }

    const now = new Date()

    // Distribución por tipo
    const typeCount = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const typeDistribution = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: (count / assets.length) * 100,
    }))

    // Distribución por estado
    const statusCount = assets.reduce((acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      percentage: (count / assets.length) * 100,
    }))

    // Distribución por marca
    const brandCount = assets.reduce((acc, asset) => {
      if (asset.brand) {
        acc[asset.brand] = (acc[asset.brand] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const brandDistribution = Object.entries(brandCount)
      .map(([brand, count]) => ({
        brand,
        count,
        percentage: (count / assets.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 marcas

    // Vencimientos próximos (SO, Office, Antivirus)
    const upcomingExpirations: {
      assetName: string
      assetId: string
      type: 'Sistema Operativo' | 'MS Office' | 'Antivirus'
      expirationDate: string
      daysUntilExpiry: number
    }[] = []

    assets.forEach((asset) => {
      // Sistema Operativo
      if (asset.sistema_operativo) {
        try {
          let so: any
          if (typeof asset.sistema_operativo === 'string') {
            // Parsear string JSON
            so = JSON.parse(asset.sistema_operativo)
          } else if (typeof asset.sistema_operativo === 'object' && asset.sistema_operativo !== null) {
            so = asset.sistema_operativo
          }
          
          // Solo agregar si sl es false (tiene licencia con fecha) y tiene fecha de vencimiento
          if (so && so.sl === false && so.fecha_vencimiento) {
            const expiryDate = new Date(so.fecha_vencimiento)
            const daysUntil = differenceInDays(expiryDate, now)
            upcomingExpirations.push({
              assetName: asset.name,
              assetId: asset.id,
              type: 'Sistema Operativo',
              expirationDate: so.fecha_vencimiento,
              daysUntilExpiry: daysUntil,
            })
          }
        } catch (e) {
          // Ignorar si hay error al parsear
        }
      }

      // MS Office
      if (asset.ms_office) {
        try {
          let office: any
          if (typeof asset.ms_office === 'string') {
            // Parsear string JSON
            office = JSON.parse(asset.ms_office)
          } else if (typeof asset.ms_office === 'object' && asset.ms_office !== null) {
            office = asset.ms_office
          }
          
          // Solo agregar si sl es false (tiene licencia con fecha) y tiene fecha de vencimiento
          if (office && office.sl === false && office.fecha_vencimiento) {
            const expiryDate = new Date(office.fecha_vencimiento)
            const daysUntil = differenceInDays(expiryDate, now)
            upcomingExpirations.push({
              assetName: asset.name,
              assetId: asset.id,
              type: 'MS Office',
              expirationDate: office.fecha_vencimiento,
              daysUntilExpiry: daysUntil,
            })
          }
        } catch (e) {
          // Ignorar si hay error al parsear
        }
      }

      // Antivirus
      if (asset.antivirus) {
        try {
          let av: any
          if (typeof asset.antivirus === 'string') {
            // Parsear string JSON
            av = JSON.parse(asset.antivirus)
          } else if (typeof asset.antivirus === 'object' && asset.antivirus !== null) {
            av = asset.antivirus
          }
          
          // Solo agregar si sl es false (tiene licencia con fecha) y tiene fecha de vencimiento
          if (av && av.sl === false && av.fecha_vencimiento) {
            const expiryDate = new Date(av.fecha_vencimiento)
            const daysUntil = differenceInDays(expiryDate, now)
            upcomingExpirations.push({
              assetName: asset.name,
              assetId: asset.id,
              type: 'Antivirus',
              expirationDate: av.fecha_vencimiento,
              daysUntilExpiry: daysUntil,
            })
          }
        } catch (e) {
          // Ignorar si hay error al parsear
        }
      }
    })

    // Ordenar por días hasta vencer (más próximos primero) y tomar solo los 5 más cercanos
    const sortedExpirations = upcomingExpirations
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 5)

    // Alertas - Garantías
    const warrantyExpiringSoon = assets.filter((asset) => {
      if (!asset.warranty_expiry) return false
      const expiryDate = new Date(asset.warranty_expiry)
      const daysUntilExpiry = differenceInDays(expiryDate, now)
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30
    })

    const expiredWarranty = assets.filter((asset) => {
      if (!asset.warranty_expiry) return false
      const expiryDate = new Date(asset.warranty_expiry)
      return isBefore(expiryDate, now)
    })

    // Equipos viejos (más de 5 años)
    const oldEquipment = assets.filter((asset) => {
      const ageMonths = differenceInMonths(now, new Date(asset.purchase_date))
      return ageMonths > 60
    })

    // Calcular antigüedad promedio para métricas
    const agesInMonths = assets
      .map((asset) => differenceInMonths(now, new Date(asset.purchase_date)))
      .filter((age) => age >= 0)
    const avgAgeMonths =
      agesInMonths.length > 0
        ? agesInMonths.reduce((sum, age) => sum + age, 0) / agesInMonths.length
        : 0

    // Equipos críticos (en mantenimiento)
    const criticalEquipment = assets.filter((asset) => asset.status === 'maintenance')

    // Análisis de áreas
    const areaCount = assets.reduce((acc, asset) => {
      const area = asset.area_encargada || 'No especificado'
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const areaAnalysis = Object.entries(areaCount)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)

    const uniqueAreas = Object.keys(areaCount).filter(area => area !== 'No especificado').length

    // Métricas generales
    const metrics = {
      totalAssets: assets.length,
      activeAssets: assets.filter((a) => a.status === 'active').length,
      maintenanceAssets: assets.filter((a) => a.status === 'maintenance').length,
      retiredAssets: assets.filter((a) => a.status === 'retired').length,
      avgPurchaseDateMonths: avgAgeMonths,
      assetsWithWarranty: assets.filter((a) => a.warranty_expiry).length,
      assetsWithoutWarranty: assets.filter((a) => !a.warranty_expiry).length,
      uniqueAreas: uniqueAreas,
    }

    // Análisis de sedes
    const sedeCount = assets.reduce((acc, asset) => {
      const sede = asset.sede || 'No especificado'
      acc[sede] = (acc[sede] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sedeAnalysis = Object.entries(sedeCount)
      .map(([sede, count]) => ({ sede, count }))
      .sort((a, b) => b.count - a.count)

    // Análisis de sistema operativo
    const osCount = assets.reduce((acc, asset) => {
      if (asset.sistema_operativo) {
        let osName = 'Desconocido'
        
        try {
          if (typeof asset.sistema_operativo === 'string') {
            // Viene como string JSON desde la BD, necesitamos parsearlo
            const so = JSON.parse(asset.sistema_operativo)
            osName = so.nombre || 'Desconocido'
          } else if (typeof asset.sistema_operativo === 'object' && asset.sistema_operativo !== null) {
            // Ya es un objeto
            const so = asset.sistema_operativo as any
            osName = so.nombre || 'Desconocido'
          }
        } catch (e) {
          // Si falla el parse, usar como está
          osName = typeof asset.sistema_operativo === 'string' ? asset.sistema_operativo : 'Desconocido'
        }
        
        acc[osName] = (acc[osName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const osAnalysis = Object.entries(osCount)
      .map(([os, count]) => ({ os, count }))
      .sort((a, b) => b.count - a.count)

    // Análisis de MS Office
    const officeCount = assets.reduce((acc, asset) => {
      if (asset.ms_office) {
        let officeName = 'Desconocido'
        
        try {
          if (typeof asset.ms_office === 'string') {
            // Viene como string JSON desde la BD, necesitamos parsearlo
            const office = JSON.parse(asset.ms_office)
            officeName = office.nombre || 'Desconocido'
          } else if (typeof asset.ms_office === 'object' && asset.ms_office !== null) {
            // Ya es un objeto
            const office = asset.ms_office as any
            officeName = office.nombre || 'Desconocido'
          }
        } catch (e) {
          // Si falla el parse, usar como está
          officeName = typeof asset.ms_office === 'string' ? asset.ms_office : 'Desconocido'
        }
        
        acc[officeName] = (acc[officeName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const officeAnalysis = Object.entries(officeCount)
      .map(([office, count]) => ({ office, count }))
      .sort((a, b) => b.count - a.count)

    // Análisis de Antivirus
    const antivirusCount = assets.reduce((acc, asset) => {
      if (asset.antivirus) {
        let avName = 'Desconocido'
        
        try {
          if (typeof asset.antivirus === 'string') {
            // Viene como string JSON desde la BD, necesitamos parsearlo
            const av = JSON.parse(asset.antivirus)
            avName = av.nombre || 'Desconocido'
          } else if (typeof asset.antivirus === 'object' && asset.antivirus !== null) {
            // Ya es un objeto
            const av = asset.antivirus as any
            avName = av.nombre || 'Desconocido'
          }
        } catch (e) {
          // Si falla el parse, usar como está
          avName = typeof asset.antivirus === 'string' ? asset.antivirus : 'Desconocido'
        }
        
        acc[avName] = (acc[avName] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const antivirusAnalysis = Object.entries(antivirusCount)
      .map(([antivirus, count]) => ({ antivirus, count }))
      .sort((a, b) => b.count - a.count)

    return {
      typeDistribution,
      statusDistribution,
      brandDistribution,
      upcomingExpirations: sortedExpirations,
      alerts: {
        warrantyExpiringSoon,
        expiredWarranty,
        oldEquipment,
        noFollowups: [], // Esto requeriría datos de seguimientos
      },
      metrics,
      sedeAnalysis,
      areaAnalysis,
      osAnalysis,
      officeAnalysis,
      antivirusAnalysis,
      criticalEquipment,
    }
  }, [assets])
}

function getEmptyAnalytics(): HardwareAnalytics {
  return {
    typeDistribution: [],
    statusDistribution: [],
    brandDistribution: [],
    upcomingExpirations: [],
    alerts: {
      warrantyExpiringSoon: [],
      expiredWarranty: [],
      oldEquipment: [],
      noFollowups: [],
    },
    metrics: {
      totalAssets: 0,
      activeAssets: 0,
      maintenanceAssets: 0,
      retiredAssets: 0,
      avgPurchaseDateMonths: 0,
      assetsWithWarranty: 0,
      assetsWithoutWarranty: 0,
      uniqueAreas: 0,
    },
    sedeAnalysis: [],
    areaAnalysis: [],
    osAnalysis: [],
    officeAnalysis: [],
    antivirusAnalysis: [],
    criticalEquipment: [],
  }
}
