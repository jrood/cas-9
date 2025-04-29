# Cas-9

Cas-9 is a no-build JavaScript framework using function-based element syntax,
signal-based state management, and fine-grained DOM updates (no VDOM). It is
also very small (less than 1 kB gzipped).

## Why the name?

In molecular biology, Cas9 is the "gene scissors" molecule used to make precise
edits to DNA. This library is the size of a molecule and makes precise updates
to the DOM.

## Example counter

```html
<script type="module">
import { elements, render, signal, computed } from 'https://cdn.jsdelivr.net/npm/cas-9@0.0.4';

const { button } = elements;

function Counter() {
  const [count, setCount] = signal(0);
  return button(
    {
      onClick: () => setCount(count() + 1),
    },
    count,
  );
}

render(Counter, document.body);
</script>
```
