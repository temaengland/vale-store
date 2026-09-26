/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hbmfkrrjxlpamzgozzmh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 750, 828, 1080, 1200],
    imageSizes: [64, 128, 256, 384],
  },
  experimental: {
    // Daily Reel (update 109): ffmpeg binary + fonts must ship with these routes.
    serverComponentsExternalPackages: ["ffmpeg-static"],
    outputFileTracingIncludes: {
      "/api/instagram/reels/tick": ["./node_modules/ffmpeg-static/ffmpeg", "./assets/reel/**"],
      "/api/admin/reels": ["./node_modules/ffmpeg-static/ffmpeg", "./assets/reel/**"],
    },
  },
};

module.exports = nextConfig;
