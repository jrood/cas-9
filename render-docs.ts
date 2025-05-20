/*
 * Render docs (currently just README.md) to html
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { marked, Renderer } from 'marked';
import { codeToHtml } from 'shiki';
import { minify } from 'html-minifier-terser';
import { transform } from 'lightningcss';

const renderer = new Renderer();

const codeBlocks = new Map<string, Promise<string>>();

renderer.code = ({ text, lang }) => {
  const id = crypto.randomUUID();
  codeBlocks.set(id, codeToHtml(text, { lang: lang!, theme: 'github-light' }));
  return id;
};

const content = readFileSync('README.md', 'utf-8');

let htmlContent = marked(content, { renderer }) as string;

for (const [id, promise] of codeBlocks) {
  htmlContent = htmlContent.replace(id, await promise);
}

const css = transform({
  filename: 'styles.css',
  code: readFileSync('docs.css'),
  minify: true,
  sourceMap: false,
});
const page = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Cas-9</title>
      <link rel=icon href=data:>
      <meta charset=UTF-8>
      <meta name=viewport content="width=device-width,initial-scale=1">
      <style>${css.code}</style>
      <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&family=JetBrains+Mono&display=swap" rel="stylesheet">
    </head>
    <body>
      <main>
        <div class="repo-link">
          <a href="https://github.com/jrood/cas-9">github.com/jrood/cas-9</a>
        </div>
        ${htmlContent}
      </main>
    </body>
  </html>
`;
writeFileSync(
  'docs/index.html',
  await minify(page, { collapseWhitespace: true }),
);

copyFileSync('logo.svg', 'docs/logo.svg');
