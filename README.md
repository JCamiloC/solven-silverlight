# Solven — Silverlight Colombia

Sistema de gestión integral para Silverlight Colombia (reemplazo de PC Health). Cubre inventario de hardware, software a medida y licencias, accesos, tickets, visitas, mantenimientos, actas con firma digital y chat de soporte.

## Stack

- **App:** Next.js 15 (App Router) + React 19 + TypeScript
- **UI:** Tailwind CSS 4 + shadcn/ui + Radix UI + Lucide
- **Datos:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Estado servidor:** TanStack React Query
- **Formularios:** React Hook Form + Zod
- **Documentos:** jsPDF, html2canvas, docx, xlsx
- **Auth extra:** TOTP (otplib / speakeasy), timeout de sesión
- **Chat:** API routes + OpenAI (bot) con escalamiento a agente humano

## Estructura

```
src/
├── app/                    # Rutas (App Router)
│   ├── actas/[token]/      # Firma pública de actas (sin login)
│   ├── auth/               # Login, forgot/reset password
│   ├── api/                # Actas, chat, usuarios, tickets, hardware
│   └── dashboard/          # App autenticada
├── components/             # UI de módulos + shadcn (`ui/`)
├── hooks/                  # React Query + auth + permisos
├── services/               # Acceso a datos (Supabase)
├── lib/                    # Supabase, PDF/Word, chat, crypto, storage
└── types/                  # Contratos TypeScript
database/                   # Migraciones SQL incrementales (fuente de verdad del esquema)
```

Patrón habitual: **página (ruta) → hook (React Query) → service (Supabase)**. PDFs y Word viven en `src/lib/services/`. Rutas API se usan cuando hace falta service role, firma pública o SMTP.

## Módulos

El eje operativo es el **cliente**. Staff entra por el dashboard global; el usuario `cliente` entra a su portal (`/dashboard/clientes/[su_client_id]`).

| Área | Rutas principales | Qué hace |
|------|-------------------|----------|
| Dashboard | `/dashboard` | Métricas, tickets recientes, mantenimientos próximos. Solo staff. |
| Clientes | `/dashboard/clientes/[id]` | Ficha, NIT, tipo de servicio, firma de empresa para actas. |
| Hardware | `.../hardware`, `.../seguimientos` | Inventario, periféricos, upgrades, seguimientos con foto, acta de entrega, hoja de vida PDF. |
| Software | `/dashboard/software`, `.../software/[appId]` | Apps a medida (ciclo de vida: discovery → posventa), documentos, reuniones, releases. Licencias en el detalle del cliente. |
| Accesos | `/dashboard/accesos`, `.../accesos` | Credenciales cifradas + bitácora (ver/crear/editar/borrar). |
| Tickets | `/dashboard/tickets` | Flujo de soporte. Número `SilverYYYYMMDD-###` (trigger en BD). |
| Visitas | `.../visitas` | Visitas técnicas por cliente, equipos intervenidos, PDF/Word. |
| Mantenimientos | `.../mantenimientos` | Cupos anuales programados por cliente. |
| Reportes | `/dashboard/reportes` | KPI tickets, hardware, mantenimientos (PDF/Word). |
| Parámetros | `/dashboard/parametros` | Catálogos (tipos, marcas, SO, Office) con inputs dinámicos. |
| Usuarios | `/dashboard/usuarios` | Perfiles, invitaciones, roles. Solo admin/líder. |
| Chat | `/dashboard/soporte-chat` + widget flotante | Bot → cola → agente. |
| Actas | `/actas/[token]` | Firma del cliente sin autenticación. |
| Configuración | `/dashboard/configuracion` | Perfil, 2FA, sesión. |

### Hardware (detalle)

- CRUD de equipos con specs (procesador, RAM, disco, SO, Office, antivirus).
- Cambios de specs se registran solos en `hardware_upgrades`.
- Seguimientos: `mantenimiento_programado | no_programado | soporte_remoto | soporte_en_sitio`, actividades JSON, foto, acción recomendada.
- **Acta de entrega:** técnico firma en dashboard → link `/actas/{token}` → cliente firma → PDF con ambas firmas (`hardware_actas` + bucket `actas`).
- **Hoja de vida PDF:** ficha + upgrades + historial de seguimientos.

### Tickets

- Estados: `open` → `pendiente_confirmacion` → `solucionado`.
- Prioridad: `low | medium | high | critical`.
- Categoría: hardware, software, network, access, other. Software puede originarse en licencia o app a medida.
- Tiempos de respuesta/solución, usuario afectado, comentarios internos.
- El UUID sigue siendo la PK; `ticket_number` es solo referencia humana.

### Chat de soporte

Estados de sesión: `bot` → `waiting_agent` → `agent_connected` → `closed`. APIs en `src/app/api/chat/`.

## Roles

| Rol | Acceso |
|-----|--------|
| **cliente** | Portal de su empresa (lectura). Puede crear/ver sus tickets y usar el chat. No ve credenciales sensibles ni módulos globales. |
| **agente_soporte** | Operación diaria: clientes, hardware, software, tickets, chat. Sin reportes/parámetros/usuarios. |
| **lider_soporte** | Agente + reportes, parámetros, usuarios, accesos globales. |
| **administrador** | Todo. |

Guards: `ProtectedRoute` + `useClientPermissions` (un cliente no entra a otro `client_id`). El sidebar filtra por rol (`Mi Empresa` para clientes). RLS en Supabase es la capa real de seguridad; el frontend solo oculta UI.

## Auth y sesión

- Supabase Auth + middleware que refresca cookies (`middleware.ts` → `src/lib/supabase/middleware.ts`).
- Timeout de inactividad + aviso (`SessionTimeoutProvider`).
- Timeouts en queries (~15s), auth inicial (~8s) y middleware (~5s) para evitar loading infinito.
- Auto-refresh de token ~cada 4 minutos (`use-auth.ts`).
- 2FA TOTP opcional/requerido según configuración.

## Storage

| Bucket | Uso |
|--------|-----|
| `solven-files` | Archivos generales |
| `seguimientos-fotos` | Fotos de seguimientos de hardware (público, autenticados suben) |
| `actas` | Firmas: `private/{acta_id}/generador.png`, `public/{acta_id}/cliente.jpg` |

## Setup

Requisitos: Node 18.17+, cuenta Supabase.

```bash
npm install
cp .env.local.template .env.local
```

Variables mínimas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo servidor; nunca al cliente
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

El esquema **no** está en este README: está en `database/*.sql`. Ejecutar migraciones en el SQL Editor de Supabase (las nuevas sobre el esquema ya existente; no hay un dump único actualizado).

Auth en Supabase: Site URL `http://localhost:3000`, redirect `http://localhost:3000/auth/callback`.

```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run test:smoke:release
```

## Convenciones al tocar código

- Tipos en `src/types/index.ts` primero si cambia el modelo.
- Permisos: no abrir rutas de staff a `cliente` sin `useClientPermissions` + RLS.
- PDFs: `src/lib/services/*-pdf.ts`. Actas: `src/services/actas.ts` + `src/app/api/actas/`.
- SQL nuevo: archivo en `database/` con nombre descriptivo; no reescribir scripts viejos.
- No reintroducir textarea libre en parámetros; las opciones van como inputs `{ value, label }`.
- Tickets: no generar `ticket_number` en el cliente; lo hace el trigger.

## Documentación de agentes

Instrucciones para Copilot/Cursor: [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
