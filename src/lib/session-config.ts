// Configuración de sesión y seguridad
export const SESSION_CONFIG = {
  // Tiempo de inactividad antes de logout automático (minutos) — fallback
  TIMEOUT_MINUTES: 120,

  // Timeout por rol (minutos de inactividad real)
  // Se reinicia con interacción DOM o peticiones a Supabase (inicio y fin).
  TIMEOUT_BY_ROLE: {
    administrador: 240,
    lider_soporte: 240,
    agente_soporte: 180,
    cliente: 60,
  } as const,

  // Aviso antes del cierre por inactividad (minutos)
  WARNING_MINUTES: 5,

  // Debounce para eventos de alta frecuencia (mousemove, scroll)
  ACTIVITY_DEBOUNCE_MS: 500,

  // Evento personalizado disparado por actividad de red autenticada
  ACTIVITY_EVENT: 'solven:session-activity',

  // Evento cuando hay peticiones en vuelo (evita cortar operaciones largas)
  REQUEST_ACTIVITY_EVENT: 'solven:session-request',

  // Habilitar/deshabilitar timeout de sesión
  ENABLED: true,

  // Configuración de cookies de sesión
  COOKIE_OPTIONS: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 días
  },

  // URLs de redirección
  REDIRECT_URLS: {
    LOGIN: '/auth/login',
    DASHBOARD: '/dashboard',
    TIMEOUT: '/auth/login?reason=timeout',
    EXPIRED: '/auth/login?reason=expired',
  },

  // Eventos DOM que reinician el contador de inactividad
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove',
    'pointerdown',
    'pointermove',
    'keydown',
    'keypress',
    'scroll',
    'wheel',
    'touchstart',
    'click',
    'focus',
  ] as const,
} as const

export type SessionRole = keyof typeof SESSION_CONFIG.TIMEOUT_BY_ROLE

export function getSessionTimeoutMinutes(role?: string | null): number {
  if (role && role in SESSION_CONFIG.TIMEOUT_BY_ROLE) {
    return SESSION_CONFIG.TIMEOUT_BY_ROLE[role as SessionRole]
  }
  return SESSION_CONFIG.TIMEOUT_MINUTES
}

/** Ventana de validez del 2FA tras verificar (minutos). */
export const TWO_FACTOR_VALIDITY_MINUTES = {
  /** Staff interno Silverlight: una vez al día */
  internal: 24 * 60,
  /** Clientes: 8 horas (mismo día laboral) */
  client: 8 * 60,
  default: 24 * 60,
} as const

export function getTwoFactorValidityMinutes(role?: string | null): number {
  if (role === 'cliente') return TWO_FACTOR_VALIDITY_MINUTES.client
  if (
    role === 'administrador' ||
    role === 'lider_soporte' ||
    role === 'agente_soporte'
  ) {
    return TWO_FACTOR_VALIDITY_MINUTES.internal
  }
  return TWO_FACTOR_VALIDITY_MINUTES.default
}

// Mensajes de sesión
export const SESSION_MESSAGES = {
  TIMEOUT_EXPIRED: 'Tu sesión ha expirado por inactividad',

  TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',

  LOGIN_REQUIRED: 'Debes iniciar sesión para acceder a esta página',
} as const
