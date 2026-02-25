# Sistema de Firmas Digitales para Actas de Entrega

## Resumen
Sistema completo para la generación de actas de entrega de hardware con firmas digitales de ambas partes (técnico generador y cliente receptor). Las firmas se capturan, almacenan y posteriormente se incrustan en el PDF final.

## Flujo Completo

### 1. Generación de Acta (Primera Fase)

**Ubicación**: `src/components/hardware/hardware-table.tsx` → función `downloadActa()`

**Proceso**:
1. Usuario hace clic en "Descargar Acta" desde la tabla de hardware
2. Sistema busca si existe una acta previa para ese hardware (`ActasService.getByHardwareAssetId()`)
3. **Decisión basada en estado**:
   - ✅ **Acta existe y está completa** → Generar PDF con firmas (ir a fase 3)
   - 🔶 **Acta existe pero incompleta** → Mostrar link de firma pendiente
   - ➕ **No existe acta** → Abrir modal para captura de firma del generador

### 2. Captura de Firma del Generador

**Ubicación**: `src/components/actas/ActaGeneratorModal.tsx`

**Componentes**:
- Formulario con campos: Nombre, Cédula, Firma (canvas)
- Componente `SignaturePad` para captura de firma digital
- Botón de limpieza de firma
- Validación de campos requeridos

**Datos capturados**:
```typescript
{
  hardware_asset_id: string,
  generador_nombre: string,
  generador_cedula: string,
  generador_firma_dataurl: string // Base64 PNG
}
```

**Proceso backend** (`src/services/actas.ts` → `createActa()`):
1. Crear registro en tabla `hardware_actas` con `estado_firma: 'falta_cliente'`
2. Convertir firma DataURL a Blob (PNG)
3. Subir firma a Supabase Storage: `actas/private/{acta_id}/generador.png`
4. Obtener URL pública de la firma subida
5. Generar token único (UUID) para link temporal
6. Actualizar registro con `generador_firma_url` y `link_temporal`
7. Retornar link: `/actas/{token}`

**Resultado**: Modal muestra link para compartir con el cliente

### 3. Firma del Cliente (Página Pública)

**Ubicación**: 
- Ruta: `/actas/[token]`
- Página: `src/app/actas/[token]/page.tsx`
- Componente: `src/components/actas/ActaSigningClient.tsx`

**Características**:
- Página pública (sin autenticación requerida)
- Búsqueda de acta por token temporal
- Formulario similar al generador: Nombre, Cédula, Firma
- Pre-carga de datos si ya se había iniciado firma
- Confirmación visual al completar

**Proceso backend** (`src/services/actas.ts` → `signByClient()`):
1. Validar token y recuperar acta
2. Convertir firma a JPEG con compresión (calidad 90%)
3. Subir firma a Storage: `actas/public/{acta_id}/cliente.jpg`
4. Actualizar registro::
   ```typescript
   {
     cliente_nombre: string,
     cliente_cedula: string,
     cliente_firma_url: string,
     estado_firma: 'completo',
     actualizado_en: timestamp
   }
   ```
5. Retornar confirmación

**Estados del acta**:
- `falta_cliente`: Solo firmó el generador
- `completo`: Ambas firmas capturadas

### 4. Generación de PDF Final con Firmas

**Ubicación**: `src/lib/services/hardware-delivery-acta-pdf.ts`

**Proceso** (cuando `estado_firma === 'completo'`):

1. **Recuperar datos del hardware y cliente**:
   ```typescript
   {
     hardware: HardwareAsset,
     empresaCliente: { nombre, nit },
     entregadoPor: { nombre, cargo, cedula },
     recibidoPor: { nombre, cedula },
     generadorFirmaUrl: string,
     clienteFirmaUrl: string
   }
   ```

2. **Generar estructura del PDF**:
   - Encabezado con logo y título
   - Fecha de entrega
   - Información de partes (quien entrega / quien recibe)
   - Descripción detallada del equipo
   - Periféricos incluidos
   - Software instalado
   - Observaciones
   - Sección de conformidad

3. **Incrustar firmas digitales**:
   ```typescript
   // Fetch de imágenes con cache-bust
   const fetchImageAsDataUrl = async (url: string) => {
     const cacheUrl = url + '?t=' + Date.now()
     const resp = await fetch(cacheUrl, { cache: 'no-store' })
     const blob = await resp.blob()
     return convertToDataURL(blob)
   }

   // Incrustar en columnas de firma
   if (generadorFirmaUrl) {
     const dataUrl = await fetchImageAsDataUrl(generadorFirmaUrl)
     doc.addImage(dataUrl, 'PNG', col1X, yPos, width, height)
   }

   if (clienteFirmaUrl) {
     const dataUrl = await fetchImageAsDataUrl(clienteFirmaUrl)
     doc.addImage(dataUrl, 'PNG', col2X, yPos, width, height)
   }
   ```

4. **Descarga automática**:
   - Nombre archivo: `ActaEntrega_{hardware_name}_{timestamp}.pdf`
   - Mensaje de éxito con toast notification

## Arquitectura de Datos

### Tabla: `hardware_actas`

```sql
CREATE TABLE hardware_actas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hardware_asset_id UUID NOT NULL REFERENCES hardware(id),
  
  -- Generador (técnico)
  generador_nombre TEXT,
  generador_cedula TEXT,
  generador_firma_url TEXT,
  
  -- Cliente
  cliente_nombre TEXT,
  cliente_cedula TEXT,
  cliente_firma_url TEXT,
  
  -- Estado y control
  estado_firma TEXT CHECK (estado_firma IN ('falta_cliente', 'completo')),
  link_temporal UUID UNIQUE,
  
  -- Timestamps
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);
```

### Storage Bucket: `actas`

**Estructura**:
```
actas/
├── private/
│   └── {acta_id}/
│       └── generador.png
└── public/
    └── {acta_id}/
        └── cliente.jpg
```

**Configuración**:
- Private: Solo accessible con autenticación
- Public: Accesible vía URL pública (necesario para PDF embed)
- Tamaño máximo: 5MB por archivo
- Formatos: PNG (generador), JPEG (cliente con compresión)

## Hooks Utilizados

### `use-actas.ts`

```typescript
// Crear acta con firma del generador
export const useCreateActa = () => {
  return useMutation({
    mutationFn: ActasService.createActa,
    onSuccess: () => toast.success('Acta creada'),
    onError: (error) => toast.error('Error al crear acta', { description: error.message })
  })
}

// Firmar como cliente
export const useSignActa = () => {
  return useMutation({
    mutationFn: ActasService.signByClient,
    onSuccess: () => toast.success('Firma registrada'),
    onError: (error) => toast.error('Error al firmar', { description: error.message })
  })
}

// Obtener acta por token
export const useActaByToken = (token: string) => {
  return useQuery({
    queryKey: ['acta', token],
    queryFn: () => ActasService.getByToken(token),
    enabled: !!token
  })
}

// Obtener acta por hardware
export const useActaByHardwareId = (hardwareId: string) => {
  return useQuery({
    queryKey: ['acta-hardware', hardwareId],
    queryFn: () => ActasService.getByHardwareAssetId(hardwareId),
    enabled: !!hardwareId
  })
}
```

## Componentes UI

### `SignaturePad.tsx`
- Canvas HTML5 para captura de firma
- Exporta imagen como DataURL (Base64)
- Métodos: `getDataURL()`, `clear()`
- Responsive y touch-friendly

### Dialogs
- **ActaGeneratorModal**: Modal interno del dashboard
- **ActaSigningClient**: Página completa pública
- **Progress Dialog**: Barra de progreso durante generación PDF

## Casos de Uso

### ✅ Caso 1: Primera Acta para Hardware Nuevo
1. Click en "Descargar Acta"
2. No existe acta → Abre modal generador
3. Técnico completa datos y firma
4. Sistema genera link y lo muestra
5. Técnico copia y envía link al cliente (email/WhatsApp)
6. Cliente abre link y firma
7. Técnico vuelve a hacer click en "Descargar Acta"
8. PDF se descarga automáticamente con ambas firmas

### 🔄 Caso 2: Acta Pendiente de Firma del Cliente
1. Click en "Descargar Acta"
2. Existe acta con `estado_firma = 'falta_cliente'`
3. Sistema muestra diálogo con link existente
4. Usuario puede re-copiar el link
5. Una vez cliente firme, puede descargar PDF completo

### 📄 Caso 3: Acta Completa (Re-descarga)
1. Click en "Descargar Acta"
2. Existe acta con `estado_firma = 'completo'`
3. PDF se genera y descarga directamente
4. Proceso es instantáneo sin mostrar modales

### ⚠️ Caso 4: Múltiples Actas (Cambio de Responsable)
- Sistema recupera **última acta** por fecha
- Si cliente cambia, se puede crear nueva acta
- Historial completo en base de datos

## Seguridad

### Control de Acceso
- **Generación de acta**: Requiere autenticación (técnico)
- **Firma de cliente**: Página pública con link único
- **Tokens**: UUID v4 (imposible de adivinar)
- **Expiración**: Links no expiran (considerar implementar TTL)

### Almacenamiento
- Firmas del generador: Storage privado
- Firmas del cliente: Storage público (necesario para embed PDF)
- Conversión JPEG con compresión para optimización

### Validaciones
- Campos requeridos en ambos formularios
- Validación de token en backend
- Verificación de existencia de acta
- Manejo de errores en upload de imágenes

## Mejoras Futuras

### Corto Plazo
- [ ] Expiración de links temporales (7 días)
- [ ] Notificación por email automática al cliente
- [ ] Preview del PDF antes de descargar
- [ ] Opción de re-enviar link

### Mediano Plazo
- [ ] Historial de actas por hardware
- [ ] Anulación de actas (con justificación)
- [ ] Firma con certificado digital
- [ ] Verificación de identidad del cliente

### Largo Plazo
- [ ] Integración con firma electrónica legal (DocuSign, etc.)
- [ ] Blockchain para trazabilidad
- [ ] Reconocimiento de firma biométrica
- [ ] Generación de QR para validación

## Troubleshooting

### ❌ Error: "No se pudo cargar firma en PDF"
**Causa**: URL de firma inaccesible o CORS
**Solución**: 
- Verificar que Storage bucket sea público para carpeta `public/`
- Revisar políticas de CORS en Supabase Storage
- Revisar console del navegador para detalles

### ❌ Error: "Link inválido o expirado"
**Causa**: Token no existe en base de datos
**Solución**: 
- Generar nuevo link desde el dashboard
- Verificar que el registro no fue eliminado

### ❌ Error: "Error al subir firma"
**Causa**: Problemas de conexión o límites de tamaño
**Solución**: 
- Verificar tamaño de firma (debe ser < 5MB)
- Revisar permisos de Storage en Supabase
- Confirmar que bucket 'actas' existe

## Notas de Implementación

### Cambios Realizados (Feb 2026)
- ✅ Descomentado flujo completo de firmas en `hardware-table.tsx`
- ✅ Habilitado código de embed de firmas en `hardware-delivery-acta-pdf.ts`
- ✅ Actualizada interfaz `ActaDeliveryData` con URLs de firmas
- ✅ Comentado flujo temporal de generación directa sin firmas
- ✅ Verificada compilación exitosa

### Código Legacy Comentado
El código de "generación directa sin firmas" fue comentado pero se mantiene en el archivo como referencia. Este flujo generaba PDFs con campos de firma en blanco para completar manualmente.

---

**Última actualización**: 16 de Febrero de 2026
**Estado**: ✅ Operacional - Flujo completo restaurado
