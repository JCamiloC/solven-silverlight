'use client'

import { Construction, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UnderConstructionProps {
  moduleName: string
  description: string
}

export function UnderConstruction({ 
  moduleName, 
  description
}: UnderConstructionProps) {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Construction className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">
                {moduleName}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="p-6 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Este módulo está actualmente en desarrollo y estará disponible próximamente.
              </p>
            </div>

            <div className="pt-4">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}