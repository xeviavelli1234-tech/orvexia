import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silencia el warning de workspace root al haber lockfiles en niveles superiores.
  turbopack: { root: __dirname },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "*.media-amazon.com" },
      { protocol: "https", hostname: "thumb.pccomponentes.com" },
      { protocol: "https", hostname: "static.fnac-static.com" },
      { protocol: "https", hostname: "images2.productserve.com" },
      { protocol: "https", hostname: "www.fnac.es" },
      { protocol: "https", hostname: "*.fnac.com" },
      { protocol: "https", hostname: "*.fnac-static.com" },
      { protocol: "https", hostname: "*.ssl-images-amazon.com" },
      { protocol: "https", hostname: "www.smarttech-tv.com" },
      { protocol: "https", hostname: "assets.mmsrg.com" },
      { protocol: "https", hostname: "dam.elcorteingles.es" },
      { protocol: "https", hostname: "*.elcorteingles.es" },
      { protocol: "https", hostname: "www.lg.com" },
      { protocol: "https", hostname: "*.lg.com" },
      { protocol: "https", hostname: "www.lg.es" },
      { protocol: "https", hostname: "*.lg.es" },
    ],
  },

  /**
   * Cabeceras de seguridad. Aplicadas a todo el sitio por defecto.
   * Nota: no añadimos CSP global porque rompería previews de imágenes y
   * scripts inline de Next; si quieres CSP estricta, configúrala por ruta.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Evita clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Evita sniffing de MIME type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Política de referrer balanceada
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permite WebAuthn / cámara / micro solo a nuestro origen
          {
            key: "Permissions-Policy",
            value: [
              "publickey-credentials-get=(self)",
              "publickey-credentials-create=(self)",
              "geolocation=()",
              "camera=()",
              "microphone=()",
              "payment=(self)",
              "interest-cohort=()",
            ].join(", "),
          },
          // HSTS — solo si estás siempre en HTTPS (lo está orvexia.es)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Bloquea descarga de docs sensibles desde otros orígenes
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      // Las rutas /api de auth/sellers nunca deben cachearse en CDN
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/api/sellers/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      // Recursos estáticos de Next: caché agresiva (immutable hash)
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
