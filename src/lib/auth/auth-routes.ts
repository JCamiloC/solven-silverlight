export function isAuthRoutePath(pathname: string): boolean {
  return pathname.startsWith('/auth')
}
