import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Development only. Next blocks cross-origin requests to dev assets, which
   * defaults to the hostname the server started on — `localhost`. Without this,
   * opening the dev server on 127.0.0.1 or on the machine's LAN address returns
   * 403 for the client chunks, so the page renders but never hydrates and
   * nothing is interactive. Useful when testing the dashboard on a real phone.
   *
   * Has no effect on a production build.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.56.1"],
};

export default nextConfig;
