import { defineConfig, Plugin } from 'rolldown';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    minify: true,
  },
  plugins: [terser() as Plugin],
});
