import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import availabilityHandler from './api/availability';
import bookingsHandler from './api/bookings';
import icalHandler from './api/ical';
import adminHandler from './api/admin';
import type { ApiRequest, ApiResponse } from './api/_lib/http';

function localApiServerPlugin(): Plugin {
  return {
    name: 'vien-local-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const apiReq = req as ApiRequest;
        const apiRes = res as ApiResponse;

        if (url.startsWith('/api/availability')) {
          await availabilityHandler(apiReq, apiRes);
          return;
        }
        if (url.startsWith('/api/bookings')) {
          await bookingsHandler(apiReq, apiRes);
          return;
        }
        if (url.startsWith('/api/ical')) {
          await icalHandler(apiReq, apiRes);
          return;
        }
        if (url.startsWith('/api/admin')) {
          await adminHandler(apiReq, apiRes);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiServerPlugin()],
  server: {
    host: true, // Expone el servidor a la red local (0.0.0.0)
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
});
