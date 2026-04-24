import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aumentar límite de body para uploads de video en API routes y Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
    // Si el middleware toca rutas con body grande, evita buffer por defecto ~10MB
    middlewareClientMaxBodySize: '2gb',
  },

  // Límite para proxy (si aplica)
  // @ts-expect-error — opción válida en runtime
  proxyClientMaxBodySize: '2gb',

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