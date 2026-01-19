import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;