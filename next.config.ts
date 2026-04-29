import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
