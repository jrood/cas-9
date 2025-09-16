import { computed, effect, setCurrentSub } from 'alien-signals';

type Props = Record<string, any>;
type Tag = string | Component;
type Component = (props: Props) => any;

export namespace JSX {
  export type IntrinsicElements = { [tag: string]: Record<string, any> };
}

const propKeys = new Set(['value', 'checked', 'disabled']);

export function jsx(t: Tag, p: Props) {
  if (t instanceof Function) {
    const sub = setCurrentSub(undefined);
    const r = t(p);
    setCurrentSub(sub);
    return r;
  }
  const e = document.createElement(t);
  let children = [];
  for (const k in p) {
    const v = p[k];
    if (k === 'children') {
      children = v;
    } else if (k.startsWith('on') && k[2] == k[2].toUpperCase()) {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v instanceof Function) {
      effect(() => {
        setAttrOrProp(e, k, v());
      });
    } else {
      setAttrOrProp(e, k, v);
    }
  }
  render(children, e);
  return e;
}

function setAttrOrProp(e: HTMLElement, k: string, v: any) {
  if (propKeys.has(k)) {
    e[k] = v;
  } else {
    e.setAttribute(k, v);
  }
}

export { jsx as jsxDEV, jsx as jsxs, jsx as jsxsDEV };

export const Fragment = (p: Props) => p.children;

export function render(content: any, container: HTMLElement) {
  const _content = [content]
    .flat(9)
    .map(x => (x instanceof Function ? computed(() => x()) : x));

  effect(() => {
    const n: Node[] = [];
    pushNodes(_content, n);
    if (!n.length || !container.childNodes.length) {
      return container.replaceChildren(...n);
    }
    const s = new Set(n);

    for (const c of Array.from(container.childNodes)) {
      if (!s.has(c)) c.remove();
    }

    for (let i = 0; i < n.length; i++) {
      const c = container.childNodes[i];
      if (!c) {
        container.append(...n.slice(i));
        break;
      }
      if (c !== n[i]) {
        container.insertBefore(n[i], c);
      }
    }
  });
}

function pushNodes(a: any, n: Node[]) {
  if (a instanceof Node) {
    n.push(a);
  } else if (Array.isArray(a)) {
    for (const b of a.flat(9)) pushNodes(b, n);
  } else if (a instanceof Function) {
    pushNodes(a(), n);
  } else if (a != null && a !== false) {
    n.push(document.createTextNode(`${a}`));
  }
}
