import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { ColorModeProvider } from '@/components/providers/color-mode-provider'
import { ThemeProvider as BrandThemeProvider } from '@/components/providers/theme-provider-brand'
import { ThemeMeta } from '@/components/theme/theme-meta'
import { SessionTimeoutProvider } from '@/components/providers/session-timeout-provider'
import { InteractionLockProvider } from '@/components/providers/interaction-lock-provider'
import { AuthProvider } from '@/hooks/use-auth'
import { Toaster } from '@/components/ui/sonner'
import { FloatingChat } from '@/components/chat/floating-chat'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solven - Sistema de Gestión Integral",
  description: "Solven: Sistema integral para Silverlight Colombia que reemplaza PC Health. Gestión de hardware, software, accesos y tickets de soporte técnico.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ColorModeProvider>
          <BrandThemeProvider defaultTheme="default">
            <ThemeMeta />
            <AuthProvider>
              <InteractionLockProvider>
                <ReactQueryProvider>
                  <SessionTimeoutProvider enabled={true}>
                    {children}
                    <FloatingChat />
                    <Toaster />
                  </SessionTimeoutProvider>
                </ReactQueryProvider>
              </InteractionLockProvider>
            </AuthProvider>
          </BrandThemeProvider>
        </ColorModeProvider>
      </body>
    </html>
  );
}
