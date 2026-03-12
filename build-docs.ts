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
    <script type="importmap">
      {
        "imports": {
          "cas-9": "https://esm.sh/cas-9@0.0.33",
          "cas-9/jsx-runtime": "https://esm.sh/cas-9@0.0.33/jsx-runtime"
        }
      }
    </script>
    <script type="module" src="https://esm.sh/tsx"></script>
  </head>
  <body>
    <main>
      <div class="repo-link">
        <a href="https://github.com/jrood/cas-9">github.com/jrood/cas-9</a>
      </div>
      ${htmlContent.replace('<img src="./logo.svg">', logo)}
      <script type="text/babel">
        /* @jsx react-jsx */
        /* @jsxImportSource cas-9 */
        import { render, signal } from 'cas-9';

        function Counter() {
          // This function only runs once.
          const count = signal(0);
          const increment = () => count(count() + 1);

          return (
            <>
              <button onClick={increment}>Increment</button>
              <p>Double count: {
                // Only this re-runs on update.
                () => count() * 2
              }</p>
            </>
          );
        }

        render(Counter, window.preview);
      </script>
    </main>
  </body>
</html>`;

writeFileSync(
  'docs/index.html',
  await minify(page, { collapseWhitespace: true }),
);
