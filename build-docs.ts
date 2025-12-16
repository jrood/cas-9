/*
 * Render docs (currently just README.md) to html
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { marked, Renderer } from 'marked';
import { createHighlighter } from 'shiki';
import { minify } from 'html-minifier-terser';
import { transform } from 'lightningcss';

const renderer = new Renderer();

const codeBlocks = new Map<string, string>();

const theme = {
  name: 'docs-theme',
  settings: [
    {
      scope: ['variable.other.constant', 'constant'],
      settings: {
        foreground: 'color(display-p3 0 .3 1)',
      },
    },
    {
      scope: ['entity', 'entity.name'],
      settings: {
        foreground: 'color(display-p3 .3 0 .9)',
      },
    },
    {
      scope: ['entity.name.tag'],
      settings: {
        foreground: 'color(display-p3 0 .5 0)',
      },
    },
    {
      scope: ['keyword', 'storage'],
      settings: {
        foreground: 'color(display-p3 .8 0 0)',
      },
    },
  ],
  fg: '#000',
  bg: '#fff',
};

const highlighter = await createHighlighter({
  themes: [theme],
  langs: ['tsx', 'sh'],
});

renderer.code = ({ text, lang }) => {
  const id = crypto.randomUUID();
  codeBlocks.set(
    id,
    highlighter.codeToHtml(text, { lang: lang!, theme: 'docs-theme' }),
  );
  return id;
};

const content = readFileSync('README.md', 'utf-8');
const logo = readFileSync('logo.svg', 'utf-8');

let htmlContent = marked(content, { renderer }) as string;

for (const [id, str] of codeBlocks) {
  htmlContent = htmlContent.replace(id, str);
}

const css = transform({
  filename: 'styles.css',
  code: readFileSync('docs.css'),
  minify: true,
  sourceMap: false,
});
const page = `<!DOCTYPE html>
<html>
  <head>
    <title>Cas-9</title>
    <link rel=icon href="data:">
    <meta charset=UTF-8>
    <meta name=viewport content="width=device-width,initial-scale=1">
    <style>${css.code}</style>
  </head>
  <body>
    <main>
      <div class="repo-link">
        <a href="https://github.com/jrood/cas-9">github.com/jrood/cas-9</a>
      </div>
      ${htmlContent.replace('<img src="./logo.svg">', logo)}
    </main>
  </body>
</html>`;

writeFileSync(
  'docs/index.html',
  await minify(page, { collapseWhitespace: true }),
);
