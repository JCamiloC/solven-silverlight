import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Configuración específica para Solven - Silverlight Colombia
  
  // Configuración de imágenes
  images: {
    domains: [
      'placeholder.supabase.co', // Temporal para desarrollo
      // Agregar dominio real de Supabase cuando esté configurado
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
