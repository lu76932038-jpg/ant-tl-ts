import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/ant-tool/',
    server: {
      port: parseInt(env.VITE_PORT),
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || '',
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    define: {
      // 'process.env.API_KEY' removed for security
      // 'process.env.GEMINI_API_KEY' removed for security
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
