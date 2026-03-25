// Configuración de sesión y seguridad
export const SESSION_CONFIG = {
  // Tiempo de inactividad antes de logout automático (en minutos)
  TIMEOUT_MINUTES: 5,
  
  // Tiempo de advertencia antes del logout (en minutos)
  WARNING_MINUTES: 0,
  
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
  
  // Eventos que resetean el timeout
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ] as const
} as const

// Mensajes de sesión
export const SESSION_MESSAGES = {
  TIMEOUT_EXPIRED: 'Tu sesión ha expirado por inactividad',
  
  TOKEN_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  
  LOGIN_REQUIRED: 'Debes iniciar sesión para acceder a esta página'
} as const