<div align="center" class="logo">
  <h1 aria-label="Cas-9">
    <img src="./logo.svg">
  </h1>
</div>

## A minimalist take on [SolidJS](https://docs.solidjs.com/)

- No VDOM
- Zero dependencies
- 692 bytes gzipped
- Fine-grained reactivity
- JSX without a custom transform

## Why the name?

CRISPR-Cas9 is the "molecular scissors" used to make selective edits to DNA. This library is the size of a molecule and makes selective updates to the DOM.

## Example counter

```tsx
import { render, signal } from 'cas-9';

function Counter() {
  const [count, setCount] = signal(0);

  const increment = () => setCount(count() + 1);

  return <button onClick={increment}>{count}</button>;
}

render(Counter, document.body);
```

## Get started with Vite

```sh
npx degit jrood/cas-9-starter my-app
cd my-app
npm i
npm run dev
```
