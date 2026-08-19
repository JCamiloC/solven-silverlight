# Solven — instrucciones para agentes

Next.js 15 App Router + TypeScript + Supabase. Mesa de ayuda e inventario para Silverlight Colombia. Documentación canónica: `README.md`.

## Arquitectura

- Páginas en `src/app/` (client components con `ProtectedRoute` en dashboard).
- Datos: hook React Query (`src/hooks/`) → service (`src/services/` o `src/lib/services/`) → Supabase.
- API routes (`src/app/api/`) solo para service role, firma pública de actas, SMTP o chat.
- Tipos en `src/types/index.ts`. UI base en `src/components/ui/` (shadcn).
- Esquema: migraciones incrementales en `database/`. No inventar tablas que no estén ahí.

## Roles

`cliente` | `agente_soporte` | `lider_soporte` | `administrador`

- Cliente: portal `/dashboard/clientes/[su_client_id]`, lectura + crear tickets + chat. Nunca otros clientes.
- Usar `useClientPermissions` y no agregar `cliente` a `allowedRoles` de módulos globales (dashboard, reportes, parámetros, usuarios, listados globales).
- RLS es obligatorio; el frontend no es la frontera de seguridad.

## Módulos a no romper

- **Hardware:** upgrades automáticos al cambiar specs; seguimientos con ENUM `tipo_seguimiento`; actas `falta_cliente` / `completo`.
- **Tickets:** `ticket_number` lo genera trigger SQL (`SilverYYYYMMDD-###`). Estados: `open` | `pendiente_confirmacion` | `solucionado`.
- **Software a medida:** ciclo discovery → posventa (fases, docs, reuniones, releases, ajustes).
- **Actas:** captura en dashboard + página pública `/actas/[token]` + PDF con firmas.
- **Chat:** `bot` → `waiting_agent` → `agent_connected` → `closed`.
- **Sesión:** timeouts y auto-refresh; no quitar guards de loading/auth.

## Estilo

- TypeScript estricto, componentes tipados, Lucide, toasts con sonner.
- Formularios: RHF + Zod. No textarea de opciones en parámetros.
- Validar inputs. Credenciales de accesos cifradas (`src/lib/crypto.ts`).
- Cambios de esquema: nuevo `.sql` en `database/`, no editar migraciones ya aplicadas como si fueran el estado actual.
