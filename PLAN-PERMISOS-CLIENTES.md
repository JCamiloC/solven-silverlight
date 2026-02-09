# Plan de Implementación de Permisos para Clientes (Revisado)

## 🎯 Nuevo Enfoque: Portal de Cliente

### Concepto Principal
Cuando un usuario con rol `cliente` inicia sesión, será redirigido automáticamente a `/dashboard/clientes/[su_client_id]`, donde tendrá:
- ✅ Vista de su información corporativa (solo lectura)
- ✅ Navegación a Hardware, Software, Accesos, Tickets (todo en modo vista)
- ✅ Capacidad de crear tickets
- ❌ Sin permisos de edición de datos

---

## 📋 Estado Actual

### ✅ Implementado Correctamente
1. **Sidebar Navigation** (`src/components/dashboard/sidebar.tsx`)
   - ✅ Filtrado de menús por rol
   - ⚠️ Clientes ven "Tickets" - **CAMBIAR a "Mi Empresa"**

2. **Protected Routes** (`src/components/auth/protected-route.tsx`)
   - ✅ Redirección automática implementada
   - ⚠️ Actualmente redirige a `/dashboard/tickets` - **CAMBIAR a `/dashboard/clientes/[client_id]`**

3. **Página de Detalle de Cliente** (`/dashboard/clientes/[id]/page.tsx`)
   - ✅ Existe y funciona para staff
   - ❌ No tiene modo de solo lectura para clientes
   - ❌ Formulario editable sin restricciones

4. **Navegación del Cliente** (Desde `/dashboard/clientes/[id]`)
   - ✅ Botones a: Hardware, Software, Accesos, Tickets
   - ⚠️ Estas páginas necesitan modo lectura para clientes

---

## 🔴 Problemas Detectados y Soluciones

### 1. **Redirección Inicial** (`protected-route.tsx`)
**Problema Actual:** Clientes se redirigen a `/dashboard/tickets`

**Solución:** Redirigir a `/dashboard/clientes/[profile.client_id]`

```tsx
if (profile?.role === 'cliente') {
  router.push(`/dashboard/clientes/${profile.client_id}`)
}
```

### 2. **Página de Detalle de Cliente** (`/dashboard/clientes/[id]/page.tsx`)
**Problema:** Formulario editable para todos los usuarios

**Solución:** Modo de solo lectura para clientes

**Cambios requeridos:**
- Detectar si el usuario es cliente
- Validar que `profile.client_id === clientId`
- Mostrar datos en modo vista (sin formulario editable)
- Mantener navegación a secciones
- Ocultar botón "Guardar"

### 3. **Páginas de Recursos del Cliente**
Estas páginas necesitan adaptarse para modo lectura:

#### `/dashboard/clientes/[id]/hardware/page.tsx`
- ❌ Botones: "Nuevo Hardware", "Editar", "Eliminar", "Descargar Acta"
- ✅ Ver listado de hardware (solo tabla de lectura)

#### `/dashboard/clientes/[id]/software/page.tsx`
- ❌ Botones: "Nueva Aplicación", "Editar", "Eliminar"
- ✅ Ver listado de software (solo tabla de lectura)

#### `/dashboard/clientes/[id]/accesos/page.tsx`
- ❌ Botones: "Nuevo Acceso", "Editar", "Eliminar", "Ver credenciales"
- ✅ Ver listado de sistemas (sin credenciales expuestas)

#### `/dashboard/clientes/[id]/tickets/page.tsx`
- ✅ Ver todos sus tickets
- ✅ Botón "Crear Ticket" (permitido)
- ❌ Botones de edición masiva o acciones administrativas

#### `/dashboard/clientes/[id]/tickets/page.tsx`
- ✅ Ver todos sus tickets
- ✅ Botón "Crear Ticket" (permitido)
- ❌ Botones de edición masiva o acciones administrativas

### 4. **Sidebar para Clientes**
**Problema:** El menú muestra "Tickets"

**Solución:** Cambiar a "Mi Empresa" que redirija a `/dashboard/clientes/[client_id]`

### 5. **Validación de Acceso**
**Problema Crítico:** Un cliente podría intentar acceder a `/dashboard/clientes/[otro_client_id]`

**Solución:** Validar en todas las páginas de clientes que:
```tsx
if (profile?.role === 'cliente' && profile.client_id !== clientId) {
  toast.error('No tienes permiso para ver este cliente')
  router.push(`/dashboard/clientes/${profile.client_id}`)
}
```

---

## 📝 Plan de Implementación Revisado

### Fase 1: Redirección y Seguridad Básica (Urgente)

#### 1.1 Actualizar ProtectedRoute
**Archivo:** `src/components/auth/protected-route.tsx`

```tsx
// Línea ~41 - Cambiar redirección de clientes
if (profile?.role === 'cliente') {
  // Verificar que tenga client_id asignado
  if (!profile.client_id) {
    toast.error('Tu cuenta no está asociada a ningún cliente')
    router.push('/auth/login')
    return
  }
  router.push(`/dashboard/clientes/${profile.client_id}`)
} else {
  router.push('/dashboard')
}
```

#### 1.2 Actualizar Sidebar Navigation
**Archivo:** `src/components/dashboard/sidebar.tsx`

```tsx
const allNavigationItems: NavigationItem[] = [
  // ... otros items
  {
    name: 'Mi Empresa',
    href: '/dashboard/clientes', // Se manejará dinámicamente
    icon: Building2,
    roles: ['cliente'],
  },
]

// En el render, detectar si es cliente y ajustar href
const navigation = allNavigationItems
  .filter(item => profile?.role && item.roles.includes(profile.role))
  .map(item => {
    if (item.roles.includes('cliente') && profile?.client_id) {
      return { ...item, href: `/dashboard/clientes/${profile.client_id}` }
    }
    return item
  })
```

#### 1.3 Modo Solo Lectura en Detalle Cliente
**Archivo:** `src/app/dashboard/clientes/[id]/page.tsx`

**Cambios principales:**

**Cambios principales:**

1. **Validación de acceso:**
```tsx
const { user, profile } = useAuth()
const isClientUser = profile?.role === 'cliente'
const isOwnClient = profile?.client_id === clientId

useEffect(() => {
  if (isClientUser && !isOwnClient) {
    toast.error('No tienes permiso para ver este cliente')
    router.push(`/dashboard/clientes/${profile.client_id}`)
  }
}, [isClientUser, isOwnClient, profile, clientId, router])
```

2. **Modo solo lectura:**
```tsx
// Reemplazar formulario editable con vista de datos
{isClientUser ? (
  <ClientReadOnlyView client={client} users={clientUsers} />
) : (
  <Form {...form}>
    {/* Formulario editable actual */}
  </Form>
)}
```

3. **Componente de vista de solo lectura:**
```tsx
function ClientReadOnlyView({ client, users }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Nombre de la Empresa" value={client.name} />
        <InfoField label="Email" value={client.email} />
        <InfoField label="NIT" value={client.nit} />
        <InfoField label="Teléfono" value={client.phone || '-'} />
        <InfoField label="Persona de Contacto" value={client.contact_person} />
        <InfoField label="Tipo de Servicio" value={getClientTypeLabel(client.client_type)} />
        <div className="md:col-span-2">
          <InfoField label="Dirección" value={client.address || '-'} />
        </div>
      </div>
      
      {/* Sección de usuarios (si aplica) */}
      {users.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Usuarios de la Empresa</h3>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{user.first_name} {user.last_name}</span>
                <Badge variant="outline">{user.email}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <Label className="text-muted-foreground">{label}</Label>
      <p className="font-medium">{value}</p>
    </div>
  )
}
```

#### 1.4 Validación en Páginas de Recursos

**Patrón a aplicar en todas las páginas hijas:**
- `/dashboard/clientes/[id]/hardware/page.tsx`
- `/dashboard/clientes/[id]/software/page.tsx`
- `/dashboard/clientes/[id]/accesos/page.tsx`
- `/dashboard/clientes/[id]/tickets/page.tsx`

```tsx
export default function ClientResourcePage() {
  const params = useParams()
  const clientId = params.id as string
  
  const { profile } = useAuth()
  const router = useRouter()
  const isClientUser = profile?.role === 'cliente'
  const isOwnClient = profile?.client_id === clientId

  // Validar acceso
  useEffect(() => {
    if (isClientUser && !isOwnClient) {
      toast.error('No tienes permiso para ver esta información')
      router.push(`/dashboard/clientes/${profile.client_id}`)
    }
  }, [isClientUser, isOwnClient, profile, clientId, router])

  // Ocultar botones de acción si es cliente
  const canEdit = !isClientUser
  const canDelete = !isClientUser
  const canCreate = !isClientUser

  return (
    <ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
      {/* UI con botones condicionales */}
      {canCreate && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo
        </Button>
      )}
      
      {/* Tabla sin acciones para clientes */}
      <ResourceTable 
        data={data}
        showActions={canEdit || canDelete}
      />
    </ProtectedRoute>
  )
}
```

### Fase 2: Adaptación de Componentes UI

#### 2.1 Componentes de Tablas
**Archivos a actualizar:**
- `src/components/hardware/hardware-table.tsx`
- Tablas de software personalizadas
- Tabla de accesos

**Cambios:**
- Prop `readOnly?: boolean` para ocultar columna de acciones
- Prop `showActions?: boolean` para mostrar/ocultar botones
- Deshabilitar clicks en filas para clientes

```tsx
interface TableProps {
  data: any[]
  readOnly?: boolean
  showActions?: boolean
  onRowClick?: (item: any) => void
}

export function ResourceTable({ data, readOnly = false, showActions = true }: TableProps) {
  return (
    <Table>
      {/* ... columnas ... */}
      {showActions && (
        <TableColumn>
          <TableHead>Acciones</TableHead>
        </TableColumn>
      )}
    </Table>
  )
}
```

#### 2.2 Actualizar ProtectedRoute en Páginas de Recursos
**Agregar 'cliente' a allowedRoles en:**

1. `/dashboard/clientes/[id]/hardware/page.tsx`
2. `/dashboard/clientes/[id]/software/page.tsx`
3. `/dashboard/clientes/[id]/accesos/page.tsx` (con restricciones adicionales)
4. `/dashboard/clientes/[id]/tickets/page.tsx` ✅ Ya permite crear

```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte', 'cliente']}>
```

### Fase 3: Páginas Administrativas (Bloquear a Clientes)

**Estas páginas NO deben ser accesibles para clientes:**

#### Mantener ProtectedRoute sin 'cliente':
1. `/dashboard/page.tsx` - Dashboard general
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

2. `/dashboard/hardware/page.tsx` - Hardware global
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

3. `/dashboard/software/page.tsx` - Software global
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

4. `/dashboard/accesos/page.tsx` - Accesos globales
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

5. `/dashboard/reportes/page.tsx` - Reportes
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

6. `/dashboard/clientes/page.tsx` - Lista de clientes
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

7. `/dashboard/usuarios/page.tsx` - Gestión de usuarios
```tsx
<ProtectedRoute allowedRoles={['administrador']}>
```

8. `/dashboard/parametros/*` - Configuración
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

9. `/dashboard/configuracion/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

### Fase 4: Tickets (Caso Especial)

#### 4.1 Página de Tickets Globales (`/dashboard/tickets/page.tsx`)
**Mantener lógica actual:**
- Clientes ven sus tickets (ya implementado)
- Staff ve todos los tickets

#### 4.2 Detalle de Ticket (`/dashboard/tickets/[id]/page.tsx`)
**Agregar validación:**
```tsx
useEffect(() => {
  if (ticket && profile?.role === 'cliente') {
    if (ticket.client_id !== profile.client_id) {
      toast.error('No tienes permiso para ver este ticket')
      router.push('/dashboard/tickets')
    }
  }
}, [ticket, profile])
```

---

---

## 🎯 Matriz de Permisos Revisada

| Módulo | Cliente | Agente Soporte | Líder Soporte | Admin |
|--------|---------|----------------|---------------|-------|
| **Dashboard General** | ❌ Bloqueado | ✅ Full | ✅ Full | ✅ Full |
| **Mi Empresa (Info)** | ✅ Solo lectura | N/A | N/A | N/A |
| **Mi Hardware** | ✅ Solo lectura | N/A | N/A | N/A |
| **Mi Software** | ✅ Solo lectura | N/A | N/A | N/A |
| **Mis Accesos** | ✅ Solo lectura* | N/A | N/A | N/A |
| **Mis Tickets** | ✅ Ver/Crear | N/A | N/A | N/A |
| **Clientes - Lista** | ❌ | ✅ Ver/Editar | ✅ Full | ✅ Full |
| **Clientes - Detalle** | ✅ Solo suyo | ✅ Todos | ✅ Full | ✅ Full |
| **Tickets - Global** | ✅ Solo suyos | ✅ Todos | ✅ Todos | ✅ Todos |
| **Tickets - Detalle** | ✅ Solo suyos | ✅ Todos | ✅ Todos | ✅ Todos |
| **Tickets - Crear** | ✅ | ✅ | ✅ | ✅ |
| **Tickets - Editar** | ❌ | ✅ | ✅ | ✅ |
| **Tickets - Tiempo R/S** | ❌ | ✅ | ✅ | ✅ |
| **Hardware - Global** | ❌ | ✅ Ver/Editar | ✅ Full | ✅ Full |
| **Software - Global** | ❌ | ✅ Ver/Editar | ✅ Full | ✅ Full |
| **Accesos - Global** | ❌ | ✅ Ver | ✅ Full | ✅ Full |
| **Reportes** | ❌ | ❌ | ✅ | ✅ |
| **Usuarios** | ❌ | ❌ | ❌ | ✅ |
| **Parámetros** | ❌ | ❌ | ✅ Ver/Editar | ✅ Full |
| **Configuración** | ❌ | ❌ | ✅ | ✅ |

\* Sin ver credenciales sensibles (passwords, claves, etc.)

---

## 🚀 Orden de Implementación Recomendado

### Sprint 1 (Seguridad Crítica) - 2-3 días

#### Tareas:
1. ✅ **Actualizar ProtectedRoute** - Redirigir a `/dashboard/clientes/[client_id]`
2. ✅ **Actualizar Sidebar** - Cambiar "Tickets" a "Mi Empresa" para clientes
3. ✅ **Validación en Detalle Cliente** - Verificar que cliente solo vea su empresa
4. ✅ **Modo Solo Lectura** - Crear componente `ClientReadOnlyView`
5. ✅ **Validación en Tickets Individual** - Cliente solo ve sus tickets
6. ✅ **Bloquear Dashboard General** - Sin 'cliente' en allowedRoles

**Archivos a modificar:**
- `src/components/auth/protected-route.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/app/dashboard/clientes/[id]/page.tsx`
- `src/app/dashboard/tickets/[id]/page.tsx`
- `src/app/dashboard/page.tsx`

### Sprint 2 (Páginas de Recursos) - 3-4 días

#### Tareas:
1. ✅ **Validar acceso en Hardware del cliente**
2. ✅ **Validar acceso en Software del cliente**
3. ✅ **Validar acceso en Accesos del cliente**
4. ✅ **Ocultar botones de acción para clientes**
5. ✅ **Adaptar tablas para modo lectura**
6. ✅ **Agregar 'cliente' a ProtectedRoute de páginas de recursos**

**Archivos a modificar:**
- `src/app/dashboard/clientes/[id]/hardware/page.tsx`
- `src/app/dashboard/clientes/[id]/software/page.tsx`
- `src/app/dashboard/clientes/[id]/accesos/page.tsx`
- `src/components/hardware/hardware-table.tsx`
- `src/components/custom-apps/custom-app-table.tsx`
- Componentes de tabla de accesos

### Sprint 3 (Refinamiento y Testing) - 2-3 días

#### Tareas:
1. ✅ **Auditoría de permisos** - Revisar todas las páginas
2. ✅ **Testing con usuario cliente** - Verificar flujos completos
3. ✅ **UX/UI para clientes** - Mejorar mensajes e indicadores
4. ✅ **Documentación** - Actualizar docs de usuario
5. ✅ **Logging de accesos** - Implementar tracking

### Sprint 4 (Mejoras Opcionales) - Según necesidad

#### Tareas opcionales:
1. ⚪ **Dashboard personalizado para clientes** - Estadísticas propias
2. ⚪ **Notificaciones para clientes** - Alertas de tickets
3. ⚪ **Exportación de reportes cliente** - PDF de su info
4. ⚪ **Historial de cambios** - Ver auditoría de su empresa

---

## 📌 Detalles de Implementación

### 1. Componente InfoField Reutilizable

**Crear:** `src/components/ui/info-field.tsx`

```tsx
import { Label } from '@/components/ui/label'

interface InfoFieldProps {
  label: string
  value: string | number | undefined | null
  className?: string
}

export function InfoField({ label, value, className }: InfoFieldProps) {
  return (
    <div className={className}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm font-medium">{value || '-'}</p>
    </div>
  )
}
```

### 2. Hook Personalizado para Permisos

**Crear:** `src/hooks/use-client-permissions.ts`

```tsx
import { useAuth } from './use-auth'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useClientPermissions() {
  const { profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  
  const clientId = params.id as string
  const isClientUser = profile?.role === 'cliente'
  const isOwnClient = profile?.client_id === clientId
  
  // Validar acceso automáticamente
  useEffect(() => {
    if (isClientUser && !isOwnClient && clientId) {
      toast.error('No tienes permiso para ver esta información')
      router.push(`/dashboard/clientes/${profile.client_id}`)
    }
  }, [isClientUser, isOwnClient, clientId, profile, router])
  
  return {
    isClientUser,
    isOwnClient,
    canEdit: !isClientUser,
    canDelete: !isClientUser,
    canCreate: !isClientUser,
    readOnly: isClientUser,
  }
}
```

**Uso:**
```tsx
export default function ClientResourcePage() {
  const { canEdit, canDelete, canCreate, readOnly } = useClientPermissions()
  
  return (
    <>
      {canCreate && <Button>Nuevo</Button>}
      <Table showActions={canEdit || canDelete} />
    </>
  )
}
```

### 3. Protección en Supabase RLS

**CRÍTICO:** Además de validaciones frontend, asegurar con RLS:

```sql
-- Política para tabla clients
CREATE POLICY "Clientes ven solo su empresa"
ON clients FOR SELECT
USING (
  CASE 
    WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'cliente'
    THEN id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid
    ELSE true
  END
);

-- Política para hardware
CREATE POLICY "Clientes ven solo su hardware"
ON hardware_assets FOR SELECT
USING (
  CASE 
    WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'cliente'
    THEN client_id = (current_setting('request.jwt.claims', true)::json->>'client_id')::uuid
    ELSE true
  END
);

-- Similar para software_licenses, access_credentials, tickets
```

---

## ✅ Checklist de Validación Final

### Seguridad
- [ ] Cliente NO puede ver información de otros clientes
- [ ] Cliente NO puede editar su propia información
- [ ] Cliente NO puede acceder a dashboard general
- [ ] Cliente NO puede ver listado global de clientes
- [ ] Cliente NO puede acceder a hardware/software/accesos globales
- [ ] Cliente NO puede ver reportes o configuración
- [ ] RLS policies configuradas en Supabase

### Funcionalidad Cliente
- [ ] Cliente se redirige a `/dashboard/clientes/[su_client_id]` al login
- [ ] Cliente ve su información corporativa (solo lectura)
- [ ] Cliente puede navegar a su hardware (solo lectura)
- [ ] Cliente puede navegar a su software (solo lectura)
- [ ] Cliente puede navegar a sus accesos (solo lectura, sin credenciales)
- [ ] Cliente puede ver sus tickets
- [ ] Cliente puede crear nuevos tickets
- [ ] Sidebar muestra "Mi Empresa" para clientes

### UX/UI
- [ ] Mensajes claros cuando cliente intenta acceso no autorizado
- [ ] Botones de edición ocultos para clientes
- [ ] Indicadores visuales de modo solo lectura
- [ ] Navegación intuitiva desde página principal del cliente
- [ ] Tooltips y ayudas contextuales

### Testing
- [ ] Login como cliente funciona correctamente
- [ ] Intentar acceder a URLs de otros clientes redirige
- [ ] Todas las páginas de recursos funcionan en modo lectura
- [ ] Creación de tickets funciona para clientes
- [ ] No hay errores en consola
- [ ] Performance es aceptable

---

## 📊 Ejemplo de Flujo de Usuario Cliente

### 1. Login
```
Cliente inicia sesión
  ↓
ProtectedRoute detecta role = 'cliente'
  ↓
Redirige a /dashboard/clientes/[client_id]
```

### 2. Página Principal (Mi Empresa)
```
/dashboard/clientes/[client_id]
  ↓
Muestra:
- Información corporativa (solo lectura)
- Botones de navegación: Hardware, Software, Accesos, Tickets
- Lista de usuarios de la empresa
```

### 3. Hardware
```
Click en "Hardware"
  ↓
/dashboard/clientes/[client_id]/hardware
  ↓
Muestra:
- Tabla de hardware asignado (solo lectura)
- Sin botones de: Nuevo, Editar, Eliminar
- Puede ver detalles (solo lectura)
```

### 4. Tickets
```
Click en "Tickets"
  ↓
/dashboard/clientes/[client_id]/tickets
  ↓
Muestra:
- Sus tickets existentes
- Botón "Crear Ticket" (permitido)
- Can view ticket details
- No puede editar metadata de tickets
```

---

## 🔐 Consideraciones de Seguridad Adicionales

### 1. Rate Limiting
- Implementar límites en API para prevenir abuso
- Clientes: max 100 requests/minuto

### 2. Logging y Auditoría
```tsx
// En cada validación de permisos fallida
logSecurityEvent({
  type: 'unauthorized_access_attempt',
  userId: user.id,
  resource: pathname,
  clientId: profile.client_id,
  attemptedClientId: params.id,
  timestamp: new Date(),
  userAgent: navigator.userAgent
})
```

### 3. Session Management
- Timeout de sesión más corto para clientes (30 min)
- Logout automático en inactividad

### 4. HTTPS y Headers de Seguridad
- Forzar HTTPS en producción
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options

---

**Fecha de creación:** 2026-02-06  
**Última actualización:** 2026-02-09  
**Responsable:** Equipo de Desarrollo  
**Prioridad:** 🔴 ALTA - Seguridad Crítica

---

## 📝 Notas de Actualización

**2026-02-09:**
- ✅ Cambio de enfoque: Los clientes ahora acceden a `/dashboard/clientes/[client_id]` como portal principal
- ✅ Implementación de modo solo lectura para información corporativa
- ✅ Navegación interna dentro del portal del cliente (Hardware, Software, Accesos, Tickets)
- ✅ Cliente NO puede editar su información, solo visualizarla
- ✅ Sidebar modificado para mostrar "Mi Empresa" en lugar de "Tickets"
- ✅ Hook personalizado `useClientPermissions` para reutilización de lógica de permisos
