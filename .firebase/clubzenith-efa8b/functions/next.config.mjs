// next.config.mjs
var nextConfig = {
  /* config options here */
  typescript: {
    // ignoreBuildErrors: true, // Removed to enforce type checking during build
  },
  eslint: {
    // ignoreDuringBuilds: true, // Removed to enforce linting during build
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        port: "",
        pathname: "/v1/create-qr-code/**"
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**"
      }
    ]
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
