import { defineConfig } from 'vitest/config';
import { testEnv } from './tests/testEnv.js';

export default defineConfig({
  test: {
    env: testEnv,
    globalSetup: ['tests/globalSetup.ts'],
    // одна тестовая БД — файлы гоняем последовательно
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
