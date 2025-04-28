import { effect } from './signals';

export const elements = new Proxy(
  {},
  {
    get(_, tag: string) {
      return (params: Record<string, unknown>, ...children: unknown[]) =>
        createElement(tag, params, children);
    },
  },
) as Record<
  string,
  (props: Record<string, unknown>, ...children: unknown[]) => HTMLElement
>;

function createElement(
  tag: string,
  props: Record<string, unknown>,
  children: unknown[],
) {
  if (tag === 'script') {
    throw new Error('Script elements cannot be programmatically created.')
  }
  const el = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (k.startsWith('on') && k[2] === k[2].toUpperCase()) {
      if (v instanceof Function) {
        const evt = k.slice(2).toLowerCase();
        el.addEventListener(evt, v as EventListener);
      }
    } else if (v instanceof Function) {
      effect(() => {
        el.setAttribute(k, v());
      });
    } else {
      el.setAttribute(k, `${v}`);
    }
  }
  effect(() => {
    el.replaceChildren(
      ...children
        .map(c => (c instanceof Function ? c() : c))
        .flat(Infinity)
        .filter(c => c || c === 0)
        .map(c => (c instanceof Node ? c : document.createTextNode(c))),
    );
  });
  return el;
}

export const render = (component, container: HTMLElement) =>
  container.append(...[component()].flat(Infinity));
