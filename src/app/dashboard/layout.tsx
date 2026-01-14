'use client'

import { Sidebar } from '@/components/dashboard'
import { Header } from '@/components/dashboard/header'
import { SecurityProvider } from '@/components/security/security-provider'
import { SidebarProvider, useSidebar } from '@/components/dashboard/sidebar-context'
import { NavigationLoader } from '@/components/ui/navigation-loader'
import { SessionDebugger } from '@/components/debug/session-debugger'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed, isHovered } = useSidebar()
  const sidebarWidth = isCollapsed && !isHovered ? 'w-20' : 'w-64'
  const mainMargin = isCollapsed && !isHovered ? 'md:ml-20' : 'md:ml-64'

  return (
    <div className="min-h-screen">
      {/* Navigation Loading Bar */}
      <NavigationLoader />
      
      {/* Fixed Sidebar - Solo visible en desktop */}
      <div className={`hidden md:block fixed left-0 top-0 z-30 h-screen p-2 transition-all duration-300 ${sidebarWidth}`}>
        <div className="w-full h-full bg-white/80 backdrop-blur-sm rounded-[5px] shadow-sm border border-white/20 overflow-hidden">
          <div className="flex flex-col h-full pt-5 pb-4 overflow-y-auto overflow-x-hidden">
            <Sidebar />
          </div>
        </div>
      </div>
      
      {/* Main content area with margin for sidebar */}
      <div className={`min-h-screen p-2 sm:p-4 transition-all duration-300 ${mainMargin}`}>
        <div className="flex flex-col min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)] gap-2 sm:gap-4">
          {/* Header Card */}
          <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm rounded-[5px] shadow-sm border border-white/20">
            <Header />
          </div>
          
          {/* Page content Card */}
          <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-[5px] shadow-sm border border-white/20 overflow-hidden">
            <main className="h-full overflow-y-auto">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
      
      {/* Session Debugger - Solo en desarrollo */}
      <SessionDebugger />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SecurityProvider>
      <SidebarProvider>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </SecurityProvider>
  )
}