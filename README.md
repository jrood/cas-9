<div align="center" class="logo">
  <h1 aria-label="Cas-9">
    <img src="./logo.svg">
  </h1>
</div>

## A tiny signal-powered web framework

Cas-9 is a minimalist take on [SolidJS](https://docs.solidjs.com/), charactized by:
- React-style JSX function components
- [Signal](https://github.com/tc39/proposal-signals)-powered state management
- No VDOM
- Zero dependencies
- 692 bytes gzipped

## Why the name?

CRISPR-Cas9 is the "molecular scissors" used to make selective edits to DNA. This library is the size of a molecule and makes selective updates to the DOM.



## What are Signals?
[Signals](https://github.com/tc39/proposal-signals) are a tool for managing stateful values, where "effect" functions that rely on those values are automatically tracked.

```tsx
const [value, setValue] = signal('a');

effect(() => {
  console.log(value());
});

setValue('b');

// Both 'a' and 'b' are logged.
```

## How are DOM updates fine-grained?

Like React, components are defined with functions that return JSX. Unlike React, changes to state in Cas-9 do not cause whole components to re-run. Rather,
only small functions within JSX are re-rendered as effects of the signals used. This negates the need for a virtual dom.

## Counter example

```tsx
import { render, signal } from 'cas-9';

function Counter() {
  // This function only runs once.
  const [count, setCount] = signal(0);
  const increment = () => setCount(count() + 1);

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

render(Counter, document.body);
```

## Get started with Vite

```sh
npx degit jrood/cas-9-starter my-app
cd my-app
npm i
npm run dev
```
