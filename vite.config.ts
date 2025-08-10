import { defineConfig } from 'vite';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    // Use SWC for TypeScript transformation with decorator support
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'node18',
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'fastify',
        '@fastify/cors',
        'fastify-sse-v2',
        'neverthrow',
        'remeda',
        'zod',
        'zod-to-json-schema',
        'jsonrpc-lite',
        'reflect-metadata',
        'class-transformer',
        'class-validator',
        'node:fs',
        'node:path',
        'node:url',
        'node:process',
        'node:readline',
      ],
    },
  },
});
