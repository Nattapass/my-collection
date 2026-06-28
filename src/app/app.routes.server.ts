// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';
export const serverRoutes: ServerRoute[] = [
  {
    path: '', // This renders the "/" route on the client (CSR)
    renderMode: RenderMode.Client,
  },
  {
    path: 'dashboard', // This renders the "/" route on the client (CSR)
    renderMode: RenderMode.Client,
  },
  {
    path: 'register', // This page is static, so we prerender it (SSG)
    renderMode: RenderMode.Server,
  },
  {
    path: 'manga', // This page requires user-specific data, so we use SSR
    renderMode: RenderMode.Server,
  },
  {
    path: 'model-kit', // This page requires user-specific data, so we use SSR
    renderMode: RenderMode.Server,
  },
  {
    path: 'tier-list',
    renderMode: RenderMode.Server,
  },
  {
    path: '**', // All other routes will be rendered on the server (SSR)
    renderMode: RenderMode.Server,
  },

];
