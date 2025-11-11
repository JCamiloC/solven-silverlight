import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from '@/components/providers/react-query-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ThemeProvider as BrandThemeProvider } from '@/components/providers/theme-provider-brand'
import { Toaster } from '@/components/ui/sonner'

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrandThemeProvider>
            <ReactQueryProvider>
              {children}
              <Toaster />
            </ReactQueryProvider>
          </BrandThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
