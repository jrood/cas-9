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
const styles = `
  body {
    font-family: Figtree, system-ui;
    margin: 0;
    padding: 0;
  }
  main {
    max-width: 768px;
    margin: 0 auto;
    padding: 2rem;
    border-radius: 2rem;
    background: #f8f4f0;
    box-shadow: inset 0 17rem 0 0 #fff;
  }
  p {
    line-height: 1.5rem;
  }
  .logo {
    margin-bottom: 4rem;
    display: flex;
    height: 12rem;
    align-items: center;
    justify-content: center;
  }
  h1, h2, h3, h4 {
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: .5rem;
  }
  pre {
    font-family: "JetBrains Mono";
    font-size: 14px;
    padding: 1rem;
    border-radius: .5rem;
    overflow-x: auto;
  }
  code {
    font-family: inherit;
  }
  .repo-link {
    display: flex;
    flex-direction: row-reverse;
  }
  a {
    color: #f60;
  }
`;
const css = transform({
  filename: 'styles.css',
  code: Buffer.from(styles),
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
