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
  
  // Archivos estáticos de ffmpeg.wasm (compresión en navegador)
  async headers() {
    return [
      {
        source: "/ffmpeg/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // SharedArrayBuffer necesario para @ffmpeg/ffmpeg WASM.
        // COEP "credentialless" permite cargar recursos de Supabase/CDN sin romper URLs firmadas.
        source: "/marketing/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
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
        destination: "/marketing/videos",
        permanent: false,
      },
      {
        source: "/marketing/video-automation",
        destination: "/marketing/videos",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;