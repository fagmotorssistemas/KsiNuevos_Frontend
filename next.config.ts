import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Configuración de Imágenes (Nueva)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Tu dominio de Supabase
        hostname: 'enfqumrstqefbxtwsslq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // 2. Tus redirecciones existentes (Las mantenemos igual)
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