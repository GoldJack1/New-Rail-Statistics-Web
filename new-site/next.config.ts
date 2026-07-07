import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/stations", destination: "/admin/stations", permanent: false },
      { source: "/stations/edit", destination: "/admin/stations", permanent: false },
      {
        source: "/stations/pending-review",
        destination: "/admin/stations/pending-review",
        permanent: false,
      },
      { source: "/stations/new", destination: "/admin/stations/new", permanent: false },
      {
        source: "/stations/:network/:stationSlug/edit",
        destination: "/admin/stations/:network/:stationSlug/edit",
        permanent: false,
      },
      { source: "/design-system", destination: "/admin/design-system", permanent: false },
      { source: "/design-system/:path*", destination: "/admin/design-system/:path*", permanent: false },
      { source: "/api-status", destination: "/admin/api-status", permanent: false },
    ];
  },
};

export default nextConfig;
