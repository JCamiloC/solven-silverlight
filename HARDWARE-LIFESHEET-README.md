# 📄 Sistema de Hoja de Vida de Hardware

Sistema completo para generar PDFs profesionales con la historia completa de los equipos de hardware.

## 🎯 Características

### Secciones del PDF

1. **📋 Información General**
   - Nombre del equipo
   - Cliente asignado
   - Tipo de hardware
   - Estado actual
   - Ubicación
   - Usuario asignado
   - Fechas de adquisición y registro

2. **🔧 Especificaciones Técnicas**
   - Procesador (con indicador de actualización)
   - Memoria RAM (con indicador de actualización)
   - Disco Duro (con indicador de actualización)
   - Sistema Operativo
   - Modelo y número de serie
   - **Historial detallado de actualizaciones físicas**
     - Fecha de cada cambio
     - Componente actualizado
     - Valor anterior → Valor nuevo
     - Color-coded para fácil lectura

3. **🛠️ Historial de Mantenimientos**
   - Lista completa de seguimientos
   - Tipo de mantenimiento
   - Fecha y hora
   - Descripción detallada
   - Actividades realizadas
   - Técnico responsable

4. **🏢 Footer Corporativo**
   - Branding "Silverlight Colombia"
   - Número de página en cada hoja
   - Línea divisoria con colores corporativos

## 📁 Estructura de Archivos

```
src/
├── lib/
│   └── services/
│       └── hardware-lifesheet-pdf.ts    # Servicio de generación de PDF
├── services/
│   └── hardware.ts                      # Métodos getUpgrades() y getFollowUps()
├── app/
│   └── dashboard/
│       └── clientes/
│           └── [id]/
│               └── hardware/
│                   └── [hardwareId]/
│                       └── seguimientos/
│                           └── page.tsx  # Botón "Generar Hoja de Vida"
└── components/
    └── hardware/
        └── hardware-upgrades-history.tsx # Componente visual de upgrades
```

## 🚀 Uso

### Desde la Interfaz

1. Navega a un cliente específico
2. Selecciona un equipo de hardware
3. Ve a la sección "Seguimientos"
4. Haz clic en el botón **"Generar Hoja de Vida (PDF)"**
5. El PDF se descargará automáticamente

### Programáticamente

```typescript
import { HardwareLifesheetPDF } from '@/lib/services/hardware-lifesheet-pdf'
import { hardwareService } from '@/services/hardware'

// Obtener datos
const hardware = await hardwareService.getById(hardwareId)
const upgrades = await hardwareService.getUpgrades(hardwareId)
const followUps = await hardwareService.getFollowUps(hardwareId)

// Generar PDF
await HardwareLifesheetPDF.generateLifesheet(hardware, upgrades, followUps)
```

## 🔄 Flujo de Datos

### Detección Automática de Upgrades

Cuando se actualiza un equipo de hardware:

```typescript
// En hardware.ts > update()
1. Se obtienen los valores actuales (procesador, RAM, disco)
2. Se comparan con los nuevos valores
3. Si hay cambios, se registran automáticamente en hardware_upgrades
4. Se guarda el usuario que hizo el cambio (updated_by)
```

### Generación del PDF

```typescript
1. Se obtiene el hardware completo
2. Se cargan los upgrades históricos
3. Se cargan los seguimientos/mantenimientos
4. Se genera el PDF con jsPDF
5. Se descarga automáticamente
```

## 🎨 Diseño y Colores

- **Color corporativo**: `#2980b9` (Azul)
- **Headers**: Fondo azul con texto blanco
- **Upgrades**: 
  - Verde para valores nuevos
  - Rojo tachado para valores anteriores
  - Indicador ⬆ para componentes actualizados
- **Seguimientos**: Filas alternadas con fondo gris claro

## 📊 Datos Incluidos

### Hardware Asset
```typescript
{
  name: string
  type: string
  status: 'active' | 'maintenance' | 'retired'
  location: string
  assigned_user: string
  purchase_date: string
  procesador: string
  memoria_ram: string
  disco_duro: string
  sistema_operativo: string
  model: string
  serial_number: string
  client: { name: string }
}
```

### Hardware Upgrades
```typescript
{
  id: string
  hardware_id: string
  previous_procesador?: string
  previous_memoria_ram?: string
  previous_disco_duro?: string
  new_procesador?: string
  new_memoria_ram?: string
  new_disco_duro?: string
  changed_fields: string[]
  created_at: string
  updater?: { first_name, last_name }
}
```

### Follow Ups (Seguimientos)
```typescript
{
  id: string
  tipo: 'mantenimiento_programado' | 'mantenimiento_no_programado' | 'soporte_remoto' | 'soporte_en_sitio'
  detalle: string
  actividades: string[]
  fecha_registro: string
  creator?: { first_name, last_name }
}
```

## ⚙️ Configuración

### Personalización de Colores

En `hardware-lifesheet-pdf.ts`:

```typescript
// Header principal
doc.setFillColor(41, 128, 185) // RGB del azul corporativo

// Headers de secciones
doc.setTextColor(41, 128, 185)

// Líneas divisorias
doc.setDrawColor(41, 128, 185)
```

### Ajuste de Márgenes

```typescript
const margin = 20          // Margen izquierdo/derecho
const maxWidth = 170       // Ancho máximo de contenido
const pageHeight = 297     // Alto de página A4
```

## 🔧 Funciones Helper

### `checkNewPage(neededSpace)`
Verifica si hay espacio suficiente en la página actual, si no, crea una nueva.

### `hasUpgrade(upgrades, field)`
Verifica si un componente específico tiene actualizaciones históricas.

### `translateField(field)`
Traduce nombres técnicos a español legible.

### `translateTipo(tipo)`
Traduce tipos de seguimiento a formato presentable.

### `translateStatus(status)`
Traduce estados de hardware a español.

## 📝 Notas Técnicas

- **Paginación automática**: El PDF maneja múltiples páginas automáticamente
- **Text wrapping**: Los textos largos se dividen en múltiples líneas
- **Footer consistente**: Aparece en todas las páginas
- **Formato de fechas**: Usa `date-fns` con locale español
- **Carga dinámica**: jsPDF se importa dinámicamente para optimizar bundle size

## 🚨 Manejo de Errores

```typescript
try {
  await HardwareLifesheetPDF.generateLifesheet(...)
  toast.success('PDF generado')
} catch (error) {
  console.error('Error:', error)
  toast.error('No se pudo generar el PDF')
}
```

## 📦 Dependencias

- `jspdf`: Generación de PDFs
- `date-fns`: Formato de fechas
- `sonner`: Notificaciones toast

## 🔮 Futuras Mejoras

- [ ] Agregar gráficos de evolución de componentes
- [ ] Incluir fotos de seguimientos en el PDF
- [ ] Exportar múltiples hojas de vida en un ZIP
- [ ] Enviar PDF por email directamente
- [ ] Agregar firma digital del técnico
- [ ] Template personalizable por cliente
- [ ] Modo de impresión optimizado
- [ ] Watermark opcional para documentos draft

## 📞 Soporte

Para cualquier duda o mejora, contacta al equipo de desarrollo de Silverlight Colombia.
