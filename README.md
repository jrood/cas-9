<div align="center" class="logo">
  <img src="./logo.svg">
</div>

Cas-9 is a small (less than 1 kB gzipped) JavaScript framework using JSX, signals, and fine-grained DOM updates. There is no VDOM. Component functions only run once.

⚠️ This is an experimental framework, not yet fit for production. If you're looking for a similar solution that is feature-rich and battle-tested, consider [Solid](https://docs.solidjs.com/).

## Why the name?

In molecular biology, Cas9 is the "gene scissors" molecule used to make precise edits to DNA.
This library is the size of a molecule and makes precise updates to the DOM.

## Get started
```sh
npx degit jrood/cas-9-starter my-app
cd my-app
npm i
npm run dev
```

## Concepts

Create signals as getter/setter tuples.
```tsx
const [myValue, setMyValue] = signal('initial value');
```

Access the value by calling as a function.
```tsx
console.log(myValue());
```

Bind to the dom by passing directly (without calling).
```tsx
<div>{myValue}</div>
```

Effects autodetect their dependencies according to which signals are called.
```tsx
const [a, setA] = signal(5);
const [b, setB] = signal(8);
effect(() => {
  console.log(a() + b());
});
```

While component functions only run once, functions passed into jsx will run
anytime underlying signals are updated.
```tsx
<div>{() => count() % 2 ? 'odd' : 'even'}</div>
```

Computed functions run lazily and are only executed once when a dependency
changes, even if used by multiple effects, dom bindings, or other computeds.
```tsx
const sum = computed(() => a() + b());
```

## Examples

### Counter

```tsx
import { render, signal } from 'cas-9';

function Counter() {
  const [count, setCount] = signal(0);
  return (
    <>
      <button onClick={() => setCount(count() + 1)}>
        {count}
      </button>
      <div>Double count: {() => count() * 2}</div>
    </>
  );
}

render(Counter, document.body);
```

### Veggie search

```tsx
import { computed, render, signal } from 'cas-9';

const veggies = ['beet', 'carrot', 'radish', 'turnip', 'parsnip'];

export function VeggieSearch() {
  const [search, setSearch] = signal('');

  const matches = computed(() =>
    veggies.filter(veggie =>
      veggie.includes(search())
    ),
  );

  return (
    <>
      <input
        onInput={(evt) => setSearch(evt.target.value)}
      />
      <ul>{() =>
        matches().map(veggie =>
          <li>{veggie}</li>
        )
      }</ul>
    </>
  );
}

render(VeggieSearch, document.body);
```

## JSX config

Configure typescript for cas-9 jsx.

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "cas-9"
  }
}
```
