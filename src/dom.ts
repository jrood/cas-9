import { effect, untrack } from './signals';

type Props = Record<string, any>;
type Tag = string | Component;
type Scalar = string | number | boolean;
type Fn = () => unknown;
type Part = Scalar | Node | Fn | null;
type Component = (props: Props) => Part | Part[];

export const jsx = (tag: Tag, props: Props) =>
  typeof tag === 'string'
    ? renderElement(tag, props)
    : untrack(() => tag(props));

export const Fragment = (props: Props) => props.children;

function renderElement(tag: string, props: Props) {
  const el = document.createElement(tag);
  let children = [];
  for (const k in props) {
    const v = props[k];
    if (k === 'children') {
      children = v;
    } else if (k.startsWith('on') && k[2] == k[2].toUpperCase()) {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v instanceof Function) {
      effect(() => {
        el.setAttribute(k, v());
      });
    } else {
      el.setAttribute(k, v);
    }
  }
  render(children, el);
  return el;
}

export function render(
  content: any,
  container: HTMLElement,
  anchor?: Node,
  ...prevs: Node[][]
) {
  const flat = [content]
    .flat(9)
    .filter(c => c != null && c !== false) as NonNullable<Part>[];
  if (prevs.length && !flat.length) flat.push(document.createComment(''));
  let q: Node[] = [];
  const flush = () => {
    container.append(...q);
    q = [];
  };
  for (const c of flat) {
    if (c instanceof Function) {
      q.length && flush();
      let prev: Node[];
      effect(() => {
        const _anchor = prev?.[0];
        const nodes: Node[] = [];
        render(c(), container, _anchor, nodes, ...prevs);
        if (_anchor) {
          for (const e of prev) container.removeChild(e);
          for (const p of prevs) p.splice(p.indexOf(_anchor), prev.length);
        }
        prev = nodes;
      });
    } else {
      const n = c instanceof Node ? c : document.createTextNode(`${c}`);
      if (anchor) {
        anchor.parentElement?.insertBefore(n, anchor);
        for (const p of prevs) p.splice(p.indexOf(anchor), 0, n);
      } else {
        q.push(n);
        for (const p of prevs) p.push(n);
      }
    }
  }
  flush();
}
