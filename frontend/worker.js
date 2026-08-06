/**
 * Cloudflare Workers entry point for the Mig Flares frontend.
 *
 * Serves the built SPA from Workers Assets and proxies every `/api/*`
 * request to the Render backend. Without this proxy the static deploy
 * cannot handle POST (login, etc.) — Cloudflare returns 405 for non-GET
 * on asset-only deployments.
 *
 * The backend origin comes from the `API_ORIGIN` binding (a var or secret),
 * e.g. https://mig-flares-api.onrender.com
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const origin = (env.API_ORIGIN ?? "").replace(/\/+$/, "");
      if (!origin) {
        return new Response("API_ORIGIN binding is not configured", { status: 502 });
      }
      const upstream = new Request(origin + url.pathname + url.search, request);
      return fetch(upstream);
    }

    return env.ASSETS.fetch(request);
  },
};
