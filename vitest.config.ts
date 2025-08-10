import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '*.config.ts', 'src/index.ts', 'tests/**'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
  plugins: [
    // Use SWC for TypeScript transformation with decorator support
    swc.vite({
      // SWC will automatically infer settings from tsconfig.json:
      // - jsc.transform.legacyDecorator from experimentalDecorators
      // - jsc.transform.decoratorMetadata from emitDecoratorMetadata
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
