import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aumentar límite de body para uploads de video en API routes y Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
  },

  // Límite de body para route handlers (existe en runtime aunque no en los tipos de esta versión)
  // Ver: https://nextjs.org/docs/app/api-reference/config/next-config-js/middlewareClientMaxBodySize
  // @ts-expect-error — opción válida en Next.js 16 pero aún sin declarar en NextConfig types
  middlewareClientMaxBodySize: '2gb',

  // 1. Configuración de Imágenes
  images: {
    remotePatterns: [
      {
        // Tu dominio de Supabase
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        // Temporal para desarrollo (eliminar en producción)
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  
  // 2. Redirecciones existentes
  async redirects() {
    return [
      {
        source: "/",
        destination: "/home",
        permanent: false,
      },
      {
        source: "/dashboard/video-automation",
        destination: "/marketing/video-automation",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;