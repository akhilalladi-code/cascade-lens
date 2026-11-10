import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cascade-lens/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});