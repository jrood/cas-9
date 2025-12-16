type Props = Record<string, any>;
type Tag = string | Component;
type Component = (props: Props) => any;

export namespace JSX {
  export type IntrinsicElements = { [tag: string]: Props };
}

export function jsx(tag: Tag, props: Props) {
  if (tag instanceof Function) return untrack(() => tag(props));
  const e = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (k === 'children') {
      render(v, e);
    } else if (k.startsWith('on') && k[2] == k[2].toUpperCase()) {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v instanceof Function) {
      effect(() => setAttrOrProp(e, k, v()));
    } else {
      setAttrOrProp(e, k, v);
    }
  }
  return e;
}

export { jsx as jsxDEV, jsx as jsxs, jsx as jsxsDEV };

function setAttrOrProp(e: HTMLElement, k: string, v: any) {
  if (typeof e[k as keyof HTMLElement] !== 'undefined') {
    // @ts-ignore
    e[k] = v;
  } else {
    e.setAttribute(k, v);
  }
}

export const Fragment = (p: Props) => p.children;

export function render(content: any, parent: ParentNode) {
  if (content instanceof Function) {
    let prev: ChildNode[];
    effect(() => {
      const f = document.createDocumentFragment();
      render(content(), f);
      const next = Array.from(f.childNodes);
      if (!next.length) next.push(document.createComment(''));
      if (prev) {
        for (const c of prev.slice(1)) c.remove();
        prev[0].replaceWith(...next);
      } else {
        parent.append(...next);
      }
      prev = next;
    });
  } else if (Array.isArray(content)) {
    for (const c of content) render(c, parent);
  } else {
    parent.append(content);
  }
}

let current: Effect | undefined;

type Signal = Set<Effect>;

type Effect = {
  fn: () => void;
  signals: Set<Signal>; // signals used in last run
  effects: Set<Effect>; // effects created in last run
  untrack: boolean;
};

export function signal<T>(value: T) {
  const s: Signal = new Set<Effect>();
  return [
    () => {
      if (current && !current.untrack) {
        current.signals.add(s);
        s.add(current);
      }
      return value;
    },
    (newValue: T) => {
      if (newValue !== value) {
        value = newValue;
        let prev = current;
        for (const e of [...s]) {
          current = e;
          clear(e);
          e.fn();
        }
        current = prev;
      }
    },
  ] as [() => T, (newValue: T) => void];
}

function clear(e: Effect) {
  for (const c of e.effects) clear(c);
  e.effects.clear();
  for (const s of e.signals) s.delete(e);
  e.signals.clear();
}

export function effect(fn: () => void) {
  const e: Effect = {
    fn,
    signals: new Set<Signal>(),
    effects: new Set<Effect>(),
    untrack: false,
  };
  current?.effects.add(e);
  let prev = current;
  current = e;
  fn();
  current = prev;
}

export function untrack<T>(fn: () => T) {
  if (!current) return fn();
  const prev = current.untrack;
  current.untrack = true;
  const r = fn();
  current.untrack = prev;
  return r;
}
