import { defineConfig, Plugin } from 'rolldown';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    file: 'dist.js',
    minify: true,
  },
  plugins: [terser() as unknown as Plugin],
});
