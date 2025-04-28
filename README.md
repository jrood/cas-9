# Cas-9

A tiny library for making interactive web apps

- No build required
- Fine-grained DOM updates (no VDOM)
- Signal-based state management
- Very small (about 2 kB)

## Where does the name come from?
The Cas9 enzyme molecule is used to make precise edits to DNA. This library is
the size of a molecule and makes precise updates to the DOM.

## This library’s niche
Cas-9 is a no-build no-JSX framework written by someone who likes JSX and
believes that build steps are warranted in most cases. This library is meant to
fill a specific no-build niche for simple use cases. If you don’t mind having a
build step or need features that Cas-9 doesn't provide, you should probably use
[SolidJS](https://docs.solidjs.com/) instead.

## Example counter
```html
<script type="module">
import { elements, render, signal } from 'https://cdn.jsdelivr.net/npm/cas-9';

const { button } = elements;

function Counter() {
  const count = signal(0);
  return button(
    {
      onClick: () => count(count() + 1)
    },
    count,
  );
}

render(Counter, document.body);
</script>
```
