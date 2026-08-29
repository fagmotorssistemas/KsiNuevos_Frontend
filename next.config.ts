import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@react-pdf/renderer'],

  // Aumentar límite de body para uploads de video en API routes y Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
    // Si el proxy/middleware toca rutas con body grande, evita buffer por defecto ~10MB
    proxyClientMaxBodySize: '2gb',
  },

  // 1. Configuración de Imágenes
  images: {
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        // Tu dominio de Supabase
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
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
        destination: "/cuenca-azuay",
        permanent: false,
      },
      {
        source: "/home",
        destination: "/cuenca-azuay",
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
      {
        source: "/buyCar",
        destination: "/usados/cuenca",
        permanent: true,
      },
      {
        source: "/autos",
        destination: "/usados/cuenca",
        permanent: true,
      },
      {
        source: "/vehiculos",
        destination: "/usados/cuenca",
        permanent: true,
      },
      {
        source: "/vehiculos/:path*",
        destination: "/usados/cuenca/:path*",
        permanent: true,
      },
      {
        source: "/sellCar",
        destination: "/vender/cuenca",
        permanent: true,
      },
      {
        source: "/creditCar",
        destination: "/creditos/cuenca",
        permanent: true,
      },
      {
        source: "/aboutUs",
        destination: "/nosotros/cuenca",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;