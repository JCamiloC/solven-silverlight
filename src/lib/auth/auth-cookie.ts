export function hasSupabaseAuthCookieHint(): boolean {
  if (typeof document === 'undefined') return false

  return document.cookie.split(';').some((entry) => {
    const name = entry.trim().split('=')[0] || ''
    return name.startsWith('sb-') && name.includes('auth-token')
  })
}
