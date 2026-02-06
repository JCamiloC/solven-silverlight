# Plan de Implementación de Permisos para Clientes

## 📋 Estado Actual

### ✅ Implementado Correctamente
1. **Sidebar Navigation** (`src/components/dashboard/sidebar.tsx`)
   - ✅ Filtrado de menús por rol
   - ✅ Clientes solo ven: Tickets
   - ✅ Configuración oculta para clientes

2. **Protected Routes** (`src/components/auth/protected-route.tsx`)
   - ✅ Redirección automática de clientes a `/dashboard/tickets`
   - ✅ Validación de roles por página

3. **Tickets** (`src/app/dashboard/tickets/`)
   - ✅ Vista filtrada para clientes (solo sus tickets)
   - ✅ Botón "Crear Ticket" disponible para clientes
   - ✅ Campos de tiempo_respuesta/tiempo_solucion deshabilitados para clientes

---

## 🔴 Problemas Detectados

### 1. **Dashboard Principal** (`/dashboard/page.tsx`)
**Problema:** Los clientes pueden acceder al dashboard general y ver estadísticas del sistema completo.

**Riesgo:** Clientes ven información sensible:
- Total de hardware activo del sistema
- Licencias de software de todos los clientes
- Accesos gestionados (oculto pero muestra ***)
- Tickets abiertos de todos los clientes

**Solución Requerida:** Crear un dashboard específico para clientes con información limitada a sus propios datos.

### 2. **Página de Tickets Detalle** (`/dashboard/tickets/[id]/page.tsx`)
**Problema Parcial:** 
- ✅ Campos tiempo_respuesta/tiempo_solucion deshabilitados
- ❌ No hay validación de que el cliente solo vea SUS tickets
- ❌ Cliente podría acceder a tickets de otros clientes cambiando URL

**Riesgo:** Fuga de información entre clientes.

### 3. **Componentes del Dashboard**

#### `DashboardStats`
- Muestra estadísticas globales a todos los usuarios
- Clientes NO deberían ver: Hardware total, Software total, Tickets de otros

#### `HardwareOverview`
- Muestra hardware de todo el sistema
- Cliente solo debería ver SU hardware

#### `RecentTickets`
- ✅ Ya implementado filtrado por cliente (línea 66)

#### `QuickActions`
- Necesita revisión de qué acciones están disponibles para clientes

### 4. **Páginas Sin Protección Verificada**
Estas páginas necesitan revisión de permisos:
- `/dashboard/hardware` - Solo staff
- `/dashboard/software` - Solo staff
- `/dashboard/accesos` - Solo staff/admin
- `/dashboard/reportes` - Solo admin/líder
- `/dashboard/clientes` - Solo staff
- `/dashboard/usuarios` - Solo admin
- `/dashboard/parametros` - Solo admin/líder
- `/dashboard/configuracion` - Solo admin/líder
- `/dashboard/actas` - Verificar permisos

---

## 📝 Plan de Implementación

### Fase 1: Seguridad Crítica (Urgente)

#### 1.1 Validación de Acceso a Tickets Individuales
**Archivo:** `src/app/dashboard/tickets/[id]/page.tsx`

```tsx
// Agregar validación después de cargar el ticket:
useEffect(() => {
  if (ticket && profile?.role === 'cliente') {
    // Verificar que el ticket pertenece al cliente
    if (ticket.client_id !== profile.client_id) {
      toast.error('No tienes permiso para ver este ticket')
      router.push('/dashboard/tickets')
    }
  }
}, [ticket, profile])
```

#### 1.2 Dashboard Específico para Clientes
**Archivo:** `src/app/dashboard/page.tsx`

**Opción A - Redirección:**
```tsx
export default function DashboardPage() {
  const { profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (profile?.role === 'cliente') {
      router.push('/dashboard/tickets')
    }
  }, [profile, router])

  if (profile?.role === 'cliente') {
    return null
  }

  return <DashboardStaffView /> // Dashboard actual para staff
}
```

**Opción B - Vista Condicional:**
```tsx
export default function DashboardPage() {
  const { profile } = useAuth()

  if (profile?.role === 'cliente') {
    return <ClientDashboard /> // Nuevo componente
  }

  return <StaffDashboard /> // Dashboard actual
}
```

**Recomendación:** Opción A (redirección) es más segura y simple.

#### 1.3 Protección de Rutas Administrativas
**Archivos a actualizar:**

1. `/dashboard/hardware/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

2. `/dashboard/software/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

3. `/dashboard/accesos/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

4. `/dashboard/reportes/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

5. `/dashboard/clientes/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte', 'agente_soporte']}>
```

6. `/dashboard/usuarios/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador']}>
```

7. `/dashboard/parametros/*`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

8. `/dashboard/configuracion/page.tsx`
```tsx
<ProtectedRoute allowedRoles={['administrador', 'lider_soporte']}>
```

### Fase 2: APIs y Hooks

#### 2.1 Filtrado en Hooks de Datos
**Archivos a revisar:**

1. **`use-hardware.ts`**
```tsx
// Agregar filtrado por cliente si rol = cliente
const { data, isLoading } = useQuery({
  queryKey: ['hardware', profile?.client_id],
  queryFn: async () => {
    if (profile?.role === 'cliente') {
      return await HardwareService.getByClient(profile.client_id)
    }
    return await HardwareService.getAll()
  }
})
```

2. **`use-software.ts`**
```tsx
// Similar al hardware, filtrar por cliente
```

3. **`use-access-credentials.ts`**
```tsx
// Clientes NO deberían tener acceso a este hook
if (profile?.role === 'cliente') {
  throw new Error('Acceso denegado')
}
```

#### 2.2 Validación en Servicios Backend
**Archivos a revisar:**

1. **`src/lib/services/hardware.ts`**
   - Agregar método `getByClient(clientId)`
   - Validar permisos antes de operaciones

2. **`src/lib/services/software.ts`**
   - Similar a hardware

3. **`src/lib/services/tickets.ts`**
   - ✅ Ya tiene validación en queries
   - Agregar validación en `getById()` para clientes

### Fase 3: Componentes UI

#### 3.1 Crear Dashboard de Cliente
**Nuevo archivo:** `src/components/dashboard/client-dashboard.tsx`

**Contenido sugerido:**
- Estadísticas personales:
  - Mis tickets abiertos
  - Mis tickets resueltos este mes
  - Tiempo promedio de respuesta
- Lista de mis últimos tickets
- Botón grande "Crear Nuevo Ticket"
- Mi información de contacto
- Hardware asignado a mi empresa (solo lectura)

#### 3.2 Filtrar Componentes Existentes

**`DashboardStats`:**
```tsx
export function DashboardStats() {
  const { profile, hasRole } = useAuth()

  // Si es cliente, no mostrar nada o mostrar stats personales
  if (profile?.role === 'cliente') {
    return <ClientStats clientId={profile.client_id} />
  }

  // Stats actuales para staff
}
```

**`HardwareOverview`:**
```tsx
export function HardwareOverview() {
  const { profile } = useAuth()

  // Si es cliente, solo mostrar su hardware
  const { data: hardware } = useHardware(
    profile?.role === 'cliente' ? profile.client_id : undefined
  )
}
```

### Fase 4: Limpieza y Testing

#### 4.1 Auditoría de Permisos
- [ ] Revisar todas las páginas bajo `/dashboard/*`
- [ ] Verificar todos los hooks de datos
- [ ] Revisar todos los servicios
- [ ] Probar acceso con usuario tipo cliente
- [ ] Intentar acceso a URLs restringidas manualmente

#### 4.2 Logging y Monitoreo
```tsx
// Agregar logging de intentos de acceso no autorizados
if (!hasPermission) {
  logSecurityEvent({
    type: 'unauthorized_access_attempt',
    user: user.id,
    resource: pathname,
    timestamp: new Date()
  })
}
```

---

## 🎯 Matriz de Permisos

| Módulo | Cliente | Agente Soporte | Líder Soporte | Admin |
|--------|---------|----------------|---------------|-------|
| **Dashboard** | ❌ (redirigir) | ✅ Staff View | ✅ Staff View | ✅ Full View |
| **Tickets - Listar** | ✅ Solo suyos | ✅ Todos | ✅ Todos | ✅ Todos |
| **Tickets - Ver** | ✅ Solo suyos | ✅ Todos | ✅ Todos | ✅ Todos |
| **Tickets - Crear** | ✅ | ✅ | ✅ | ✅ |
| **Tickets - Editar** | ❌ | ✅ | ✅ | ✅ |
| **Tickets - Comentar** | ✅ Solo suyos | ✅ Todos | ✅ Todos | ✅ Todos |
| **Tickets - Tiempo Resp/Sol** | ❌ (disabled) | ✅ | ✅ | ✅ |
| **Hardware** | ❌ | ✅ Ver/Editar | ✅ Full | ✅ Full |
| **Software** | ❌ | ✅ Ver/Editar | ✅ Full | ✅ Full |
| **Accesos** | ❌ | ✅ Ver | ✅ Full | ✅ Full |
| **Reportes** | ❌ | ❌ | ✅ | ✅ |
| **Clientes** | ❌ | ✅ Ver | ✅ Full | ✅ Full |
| **Usuarios** | ❌ | ❌ | ❌ | ✅ |
| **Parámetros** | ❌ | ❌ | ✅ Ver/Editar | ✅ Full |
| **Configuración** | ❌ | ❌ | ✅ | ✅ |
| **Actas** | ❌ | ✅ | ✅ | ✅ |

---

## 🚀 Orden de Implementación Recomendado

### Sprint 1 (Seguridad Crítica)
1. ✅ Validación de acceso a tickets individuales
2. ✅ Redirección de clientes desde dashboard principal
3. ✅ Proteger todas las páginas administrativas con ProtectedRoute
4. ✅ Validar tickets.getById() para clientes

### Sprint 2 (Mejoras UX)
5. ✅ Crear dashboard específico para clientes
6. ✅ Filtrar stats y overview por cliente
7. ✅ Mejorar mensajes de error

### Sprint 3 (Refinamiento)
8. ✅ Auditoría completa de permisos
9. ✅ Testing con usuarios reales
10. ✅ Documentación final

---

## 📌 Notas Importantes

### Seguridad en Supabase RLS
Además de los permisos en frontend, **CRÍTICO** verificar políticas RLS:

```sql
-- Ejemplo: Política para tickets
CREATE POLICY "Clientes solo ven sus tickets"
ON tickets FOR SELECT
USING (
  auth.role() = 'cliente' AND client_id = auth.user_id()
  OR auth.role() IN ('admin', 'soporte')
);
```

### Testing
Crear usuarios de prueba:
- ✅ `test-cliente@example.com` - rol: cliente
- ✅ `test-agente@example.com` - rol: agente_soporte
- ✅ `test-lider@example.com` - rol: lider_soporte
- ✅ `test-admin@example.com` - rol: administrador

### Monitoreo
- [ ] Implementar logging de accesos denegados
- [ ] Dashboard de intentos de acceso no autorizados
- [ ] Alertas para patrones sospechosos

---

## ✅ Checklist de Validación Final

- [ ] Cliente NO puede ver tickets de otros clientes
- [ ] Cliente NO puede acceder a hardware/software/accesos
- [ ] Cliente NO puede ver reportes o métricas globales
- [ ] Cliente NO puede editar usuarios o parámetros
- [ ] Cliente SOLO ve menú de Tickets en sidebar
- [ ] Todas las páginas administrativas redirigen correctamente
- [ ] RLS policies en Supabase están configuradas
- [ ] Testing con usuarios reales completado
- [ ] Documentación actualizada

---

**Fecha de creación:** 2026-02-06  
**Última actualización:** 2026-02-06  
**Responsable:** Equipo de Desarrollo  
**Prioridad:** 🔴 ALTA - Seguridad Crítica
