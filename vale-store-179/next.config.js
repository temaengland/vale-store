/** @type {import('next').NextConfig} */
const nextConfig = {
  // Update 121: the old Decor category became part of "Art & Decor".
  async redirects() {
    return [
      { source: "/category/decor", destination: "/category/art", permanent: true },
      // Update 149: old Shopify links still in Google.
      { source: "/collections", destination: "/new", permanent: true },
      { source: "/collections/:c/products/:p", destination: "/products/:p", permanent: true },
      { source: "/products", destination: "/new", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/:p*", destination: "/about", permanent: true },
      { source: "/policies/refund-policy", destination: "/returns", permanent: true },
      { source: "/policies/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/policies/:p*", destination: "/returns", permanent: true },
      { source: "/:shop(\\d+)/policies/:p*", destination: "/returns", permanent: true },
      { source: "/blogs/:p*", destination: "/about", permanent: true },
      { source: "/account/:p*", destination: "/", permanent: true },
    ];
  },
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
