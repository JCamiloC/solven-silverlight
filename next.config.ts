import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    reactCompiler: true,
  },

  // Evita bloquear despliegues por deuda de lint existente.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuración específica para Solven - Silverlight Colombia
  
  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placeholder.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'qnwbaxlqdpdwfvrkqpvz.supabase.co',
      },
    ],
  },
  
  // Variables de entorno públicas
  env: {
    CLIENT_NAME: process.env.NEXT_PUBLIC_CLIENT_NAME || 'Silverlight Colombia',
    DEFAULT_THEME: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'silverlight',
  },
  
  // Configuración de exportación estática (deshabilitar para SSR con Supabase)
  output: process.env.NODE_ENV === 'development' ? undefined : 'standalone',
};

export default nextConfig;
