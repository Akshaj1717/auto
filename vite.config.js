import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './', // makes paths work at username.github.io/auto/
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sports: fileURLToPath(new URL('./sports.html', import.meta.url)),
      },
    },
  },
});
