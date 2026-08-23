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

  experimental: {
    serverActions: {
      /**
       * The bulk import sends the whole file through a Server Action, and
       * Server Actions cap request bodies at 1 MB by default. The import page
       * advertises a 2 MB limit, so without this a 1.5 MB spreadsheet would be
       * rejected by the framework before any of our validation ran — the admin
       * would see a generic failure with nothing explaining it.
       *
       * Set above 2 MB deliberately: the limit applies to the raw HTTP body,
       * which carries multipart boundaries and field metadata on top of the
       * file itself. The extra megabyte is headroom for that overhead, and
       * still sits under Vercel's own 4.5 MB request limit.
       */
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
