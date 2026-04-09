import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    testTimeout: 500_000,
    include: ['src/test/integration/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
}));
