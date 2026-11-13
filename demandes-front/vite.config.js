import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // "localhost" (et non 127.0.0.1) : doit correspondre exactement aux
  // Valid redirect URIs / Web origins / CORS configurés pour http://localhost:5173
  server: { host: 'localhost', port: 5173, strictPort: true }
});
