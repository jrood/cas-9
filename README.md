<img src="./logo.svg">

Cas-9 is a JavaScript framework using JSX, signals, and fine-grained DOM updates (no VDOM). It is very small (about 1.5 kB gzipped).

## Why the name?

In molecular biology, Cas9 is the "gene scissors" molecule used to make precise
edits to DNA. This library is the size of a molecule and makes precise updates
to the DOM.

## Counter example

```tsx
import { render, signal } from 'cas-9';

function Counter() {
  const [count, setCount] = signal(0);
  return <button onClick={() => setCount(count() + 1)}>{count}</button>;
}

render(Counter, document.body);
```

## Veggie search example

```tsx
import { memo, render, signal } from 'cas-9';

const veggies = ['beet', 'carrot', 'radish', 'turnip', 'parsnip'];

export function VeggieSearch() {
  const [search, setSearch] = signal('');

  const matches = memo(() =>
    veggies.filter(veggie => veggie.includes(search())),
  );

  return (
    <>
      <input onInput={(evt) => setSearch(evt.target.value)}/>
      <ul>{() =>
        matches().map(veggie => <li>{veggie}</li>)
      }</ul>
    </>
  );
}

render(VeggieSearch, document.body);
```

## tsconfig.json

Configure `tsconfig.json` for cas-9 using `"jsx": "react-jsx"` and `"jsxImportSource": "cas-9"`.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "cas-9"
  }
}
```
