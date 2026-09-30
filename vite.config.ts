/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로
  // 상대 경로를 써야 자산 URL 이 깨지지 않는다.
  base: './',
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
