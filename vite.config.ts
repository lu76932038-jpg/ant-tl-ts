import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // 优先读取 VITE_BASE_PATH，如果没有，生产环境默认 /ant-tool/，开发环境默认 /
  const basePath = env.VITE_BASE_PATH || (mode === 'production' ? '/ant-tool/' : '/');
  return {
    base: basePath,
    server: {
      port: parseInt(env.VITE_PORT),
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || '',
          changeOrigin: true,
          ws: true
        },
        '/socket.io': {
          target: env.VITE_API_BASE_URL || '',
          ws: true,
          changeOrigin: true
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
