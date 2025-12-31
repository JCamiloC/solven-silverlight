'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  showSpinner?: boolean
  onClick?: () => void
}

/**
 * Link que muestra spinner durante navegación
 */
export function LoadingLink({ href, children, className, showSpinner = true, onClick }: LoadingLinkProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onClick?.()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <Link 
      href={href} 
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 transition-opacity',
        isPending && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {children}
      {isPending && showSpinner && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
    </Link>
  )
}
