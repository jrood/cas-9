import { readFileSync, writeFileSync } from 'node:fs';
import { transform } from 'oxc-transform';
import { minify } from 'oxc-minify';

const src = readFileSync('src/index.ts').toString();

const compiled = transform('index.ts', src).code;

const minified = minify('index.ts', compiled).code;

writeFileSync('dist/index.js', minified);
