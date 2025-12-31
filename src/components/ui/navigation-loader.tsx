'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Loading indicator que se muestra durante la navegación entre rutas
 */
function NavigationLoaderInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setIsNavigating(true)

    const timeout = setTimeout(() => {
      setIsNavigating(false)
    }, 500)

    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
    </div>
  )
}

export function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderInner />
    </Suspense>
  )
}
