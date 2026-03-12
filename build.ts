import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'oxc-transform';
import { minifySync } from 'oxc-minify';

const src = readFileSync('src/index.ts').toString();

const compiled = transformSync('index.ts', src).code;

const minified = minifySync('index.ts', compiled).code;

writeFileSync('dist/index.js', minified);
