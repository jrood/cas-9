import { effect, untrack } from './signals';

type Props = Record<string, any>;
type Tag = string | Component;
type Scalar = string | number | boolean;
type Fn = () => unknown;
type Part = Scalar | Node | Fn | null;
type Component = (props: Props) => Part | Part[];

const isComponent = (t: Tag) => t instanceof Function;

export function jsx(tag: Tag, props: Props) {
  return isComponent(tag)
    ? untrack(() => tag(props))
    : renderElement(tag, props);
}

export function Fragment(props: Props) {
  return props.children;
}

function renderElement(tag: string, props: Props) {
  const el = document.createElement(tag);

  let children = [];
  for (const k in props) {
    const v = props[k];
    if (k === 'children') {
      children = v;
      continue;
    }
    if (k.startsWith('on') && k[2] == k[2].toUpperCase()) {
      const evt = k.slice(2).toLowerCase();
      el.addEventListener(evt, v);
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
  anchor?: Node | undefined,
  ...prevs: Node[][]
) {
  const flat = [content].flat(9).filter(c => c != null) as NonNullable<Part>[];
  for (const c of flat) {
    if (c instanceof Function) {
      let prev: Node[];
      effect(() => {
        const _anchor = prev?.[0];
        const nodes: Node[] = [];
        render(c(), container, _anchor, nodes, ...prevs);
        if (_anchor) {
          for (const e of prev) container.removeChild(e);
          for (const p of prevs) p.splice(p.indexOf(prev[0]), prev.length);
        }
        prev = nodes;
      });
    } else {
      const n = c instanceof Node ? c : document.createTextNode(`${c}`);
      if (prevs.length) {
        if (anchor) {
          anchor.parentElement?.insertBefore(n, anchor);
          for (const p of prevs) p.splice(p.indexOf(anchor), 0, n);
        } else {
          container.appendChild(n);
          for (const p of prevs) p.push(n);
        }
      } else {
        container.appendChild(n);
      }
    }
  }
}
