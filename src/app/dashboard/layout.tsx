'use client'

import { Sidebar, Header } from '@/components/dashboard'
import { SecurityProvider } from '@/components/security/security-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SecurityProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />
          
          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SecurityProvider>
  )
}