import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `@/…` imports, as in tsconfig.json paths
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
});
