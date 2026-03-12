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

/** The signals implementation below is adopted with thanks from alien-signals at
 * https://github.com/stackblitz/alien-signals/tree/master/src
 *
 * MIT License
 *
 * Copyright (c) 2024-present Johnson Chu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

interface ReactiveNode {
  deps?: Link;
  depsTail?: Link;
  subs?: Link;
  subsTail?: Link;
  flags: number;
}

interface Link {
  version: number;
  dep: ReactiveNode;
  sub: ReactiveNode;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

interface Stack<T> {
  value: T;
  prev: Stack<T> | undefined;
}

const None = 0,
  Mutable = 1,
  Watching = 2,
  RecursedCheck = 4,
  Recursed = 8,
  Dirty = 16,
  Pending = 32;

interface EffectNode extends ReactiveNode {
  fn(): void;
}

interface ComputedNode<T = any> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: T) => T;
}

interface SignalNode<T = any> extends ReactiveNode {
  currentValue: T;
  pendingValue: T;
}

let cycle = 0;
let batchDepth = 0;
let notifyIndex = 0;
let queuedLength = 0;
let activeSub: ReactiveNode | undefined;

const queued: (EffectNode | undefined)[] = [];

function link(dep: ReactiveNode, sub: ReactiveNode, version: number): void {
  const prevDep = sub.depsTail;
  if (prevDep && prevDep.dep === dep) return;

  const nextDep = prevDep ? prevDep.nextDep : sub.deps;
  if (nextDep && nextDep.dep === dep) {
    nextDep.version = version;
    sub.depsTail = nextDep;
    return;
  }
  const prevSub = dep.subsTail;
  if (prevSub && prevSub.version === version && prevSub.sub === sub) return;

  const newLink =
    (sub.depsTail =
    dep.subsTail =
      { version, dep, sub, prevDep, nextDep, prevSub, nextSub: undefined });

  if (nextDep) nextDep.prevDep = newLink;

  if (prevDep) prevDep.nextDep = newLink;
  else sub.deps = newLink;

  if (prevSub) prevSub.nextSub = newLink;
  else dep.subs = newLink;
}

function unlink(link: Link, sub = link.sub): Link | undefined {
  const dep = link.dep;
  const prevDep = link.prevDep;
  const nextDep = link.nextDep;
  const nextSub = link.nextSub;
  const prevSub = link.prevSub;
  if (nextDep) nextDep.prevDep = prevDep;
  else sub.depsTail = prevDep;

  if (prevDep) prevDep.nextDep = nextDep;
  else sub.deps = nextDep;

  if (nextSub) nextSub.prevSub = prevSub;
  else dep.subsTail = prevSub;

  if (prevSub) prevSub.nextSub = nextSub;
  else if ((dep.subs = nextSub) === undefined) unwatched(dep);

  return nextDep;
}

function propagate(link: Link): void {
  let next = link.nextSub;
  let stack: Stack<Link | undefined> | undefined;

  top: do {
    const sub = link.sub;
    let flags = sub.flags;

    if (!(flags & (RecursedCheck | Recursed | Dirty | Pending)))
      sub.flags = flags | Pending;
    else if (!(flags & (RecursedCheck | Recursed))) flags = None;
    else if (!(flags & RecursedCheck))
      sub.flags = (flags & ~Recursed) | Pending;
    else if (!(flags & (Dirty | Pending)) && isValidLink(link, sub)) {
      sub.flags = flags | (Recursed | Pending);
      flags &= Mutable;
    } else flags = None;

    if (flags & Watching) notify(sub);

    if (flags & Mutable) {
      const subSubs = sub.subs;
      if (subSubs) {
        const nextSub = (link = subSubs).nextSub;
        if (nextSub) {
          stack = { value: next, prev: stack };
          next = nextSub;
        }
        continue;
      }
    }

    if ((link = next!)) {
      next = link.nextSub;
      continue;
    }

    while (stack) {
      link = stack.value!;
      stack = stack.prev;
      if (link) {
        next = link.nextSub;
        continue top;
      }
    }

    break;
  } while (true);
}

function checkDirty(link: Link, sub: ReactiveNode): boolean {
  let stack: Stack<Link> | undefined;
  let checkDepth = 0;
  let dirty = false;

  top: do {
    const dep = link.dep;
    const flags = dep.flags;

    if (sub.flags & Dirty) dirty = true;
    else if ((flags & (Mutable | Dirty)) === (Mutable | Dirty)) {
      if (update(dep)) {
        const subs = dep.subs!;
        if (subs.nextSub) shallowPropagate(subs);
        dirty = true;
      }
    } else if ((flags & (Mutable | Pending)) === (Mutable | Pending)) {
      if (link.nextSub || link.prevSub) stack = { value: link, prev: stack };
      link = dep.deps!;
      sub = dep;
      ++checkDepth;
      continue;
    }

    if (!dirty) {
      const nextDep = link.nextDep;
      if (nextDep) {
        link = nextDep;
        continue;
      }
    }

    while (checkDepth--) {
      const firstSub = sub.subs!;
      const hasMultipleSubs = firstSub.nextSub !== undefined;
      if (hasMultipleSubs) {
        link = stack!.value;
        stack = stack!.prev;
      } else link = firstSub;

      if (dirty) {
        if (update(sub)) {
          if (hasMultipleSubs) shallowPropagate(firstSub);
          sub = link.sub;
          continue;
        }
        dirty = false;
      } else sub.flags &= ~Pending;

      sub = link.sub;
      const nextDep = link.nextDep;
      if (nextDep) {
        link = nextDep;
        continue top;
      }
    }

    return dirty;
  } while (true);
}

function shallowPropagate(link: Link): void {
  do {
    const sub = link.sub;
    const flags = sub.flags;
    if ((flags & (Pending | Dirty)) === Pending) {
      sub.flags = flags | Dirty;
      if ((flags & (Watching | RecursedCheck)) === Watching) notify(sub);
    }
  } while ((link = link.nextSub!));
}

function isValidLink(checkLink: Link, sub: ReactiveNode): boolean {
  let link = sub.depsTail;
  while (link) {
    if (link === checkLink) return true;
    link = link.prevDep;
  }
  return false;
}

function update(node: SignalNode | ComputedNode): boolean {
  if (node.depsTail) return updateComputed(node as ComputedNode);
  else return updateSignal(node as SignalNode);
}

function notify(effect: EffectNode) {
  let insertIndex = queuedLength;
  let firstInsertedIndex = insertIndex;

  do {
    queued[insertIndex++] = effect;
    effect.flags &= ~Watching;
    effect = effect.subs?.sub as EffectNode;
    if (effect === undefined || !(effect.flags & Watching)) break;
  } while (true);

  queuedLength = insertIndex;

  while (firstInsertedIndex < --insertIndex) {
    const left = queued[firstInsertedIndex];
    queued[firstInsertedIndex++] = queued[insertIndex];
    queued[insertIndex] = left;
  }
}

function unwatched(node) {
  if (!(node.flags & Mutable)) effectScopeOper.call(node);
  else if (node.depsTail) {
    node.depsTail = undefined;
    node.flags = Mutable | Dirty;
    purgeDeps(node);
  }
}

function setActiveSub(sub?: ReactiveNode) {
  const prevSub = activeSub;
  activeSub = sub;
  return prevSub;
}

export function untrack<T>(fn: () => T) {
  const prevSub = activeSub;
  activeSub = undefined;
  const r = fn();
  activeSub = prevSub;
  return r;
}

export function batch<T>(fn: () => T) {
  ++batchDepth;
  const r = fn();
  if (!--batchDepth) flush();
  return r;
}

export function signal<T>(initialValue: T): {
  (): T;
  (value: T): void;
} {
  return signalOper.bind({
    currentValue: initialValue,
    pendingValue: initialValue,
    subs: undefined,
    subsTail: undefined,
    flags: Mutable,
  }) as () => T | undefined;
}

export function computed<T>(getter: (previousValue?: T) => T): () => T {
  return computedOper.bind({
    value: undefined,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: None,
    getter: getter as (previousValue?: unknown) => unknown,
  }) as () => T;
}

export function effect(fn: () => void): void {
  const e: EffectNode = {
    fn,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: Watching | RecursedCheck,
  };
  const prevSub = setActiveSub(e);
  if (prevSub) link(e, prevSub, 0);

  try {
    e.fn();
  } finally {
    activeSub = prevSub;
    e.flags &= ~RecursedCheck;
  }
}

export function effectScope(fn: () => void): () => void {
  const e: ReactiveNode = {
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: None,
  };
  const prevSub = setActiveSub(e);
  if (prevSub) link(e, prevSub, 0);

  try {
    fn();
  } finally {
    activeSub = prevSub;
  }
  return effectScopeOper.bind(e);
}

function updateComputed(c: ComputedNode): boolean {
  ++cycle;
  c.depsTail = undefined;
  c.flags = Mutable | RecursedCheck;
  const prevSub = setActiveSub(c);
  try {
    const oldValue = c.value;
    return oldValue !== (c.value = c.getter(oldValue));
  } finally {
    activeSub = prevSub;
    c.flags &= ~RecursedCheck;
    purgeDeps(c);
  }
}

function updateSignal(s: SignalNode): boolean {
  s.flags = Mutable;
  return s.currentValue !== (s.currentValue = s.pendingValue);
}

function run(e: EffectNode): void {
  const flags = e.flags;
  if (flags & Dirty || (flags & Pending && checkDirty(e.deps!, e))) {
    ++cycle;
    e.depsTail = undefined;
    e.flags = Watching | RecursedCheck;
    const prevSub = setActiveSub(e);
    try {
      (e as EffectNode).fn();
    } finally {
      activeSub = prevSub;
      e.flags &= ~RecursedCheck;
      purgeDeps(e);
    }
  } else {
    e.flags = Watching;
  }
}

function flush(): void {
  try {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      run(effect);
    }
  } finally {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      effect.flags |= Watching | Recursed;
    }
    notifyIndex = 0;
    queuedLength = 0;
  }
}

function computedOper<T>(this: ComputedNode<T>): T {
  const flags = this.flags;
  if (
    flags & Dirty ||
    (flags & Pending &&
      (checkDirty(this.deps!, this) ||
        ((this.flags = flags & ~Pending), false)))
  ) {
    if (updateComputed(this)) {
      const subs = this.subs;
      if (subs) shallowPropagate(subs);
    }
  } else if (!flags) {
    this.flags = Mutable | RecursedCheck;
    const prevSub = setActiveSub(this);
    try {
      this.value = this.getter();
    } finally {
      activeSub = prevSub;
      this.flags &= ~RecursedCheck;
    }
  }
  const sub = activeSub;
  if (sub) link(this, sub, cycle);

  return this.value!;
}

function signalOper<T>(this: SignalNode<T>, ...value: [T]): T | void {
  if (value.length) {
    if (this.pendingValue !== (this.pendingValue = value[0])) {
      this.flags = Mutable | Dirty;
      const subs = this.subs;
      if (subs) {
        propagate(subs);
        if (!batchDepth) flush();
      }
    }
  } else {
    if (this.flags & Dirty) {
      if (updateSignal(this)) {
        const subs = this.subs;
        if (subs) shallowPropagate(subs);
      }
    }
    let sub = activeSub;
    while (sub) {
      if (sub.flags & (Mutable | Watching)) {
        link(this, sub, cycle);
        break;
      }
      sub = sub.subs?.sub;
    }
    return this.currentValue;
  }
}

function effectOper(this: EffectNode): void {
  effectScopeOper.call(this);
}

function effectScopeOper(this: ReactiveNode): void {
  this.depsTail = undefined;
  this.flags = None;
  purgeDeps(this);
  const sub = this.subs;
  if (sub) unlink(sub);
}

function purgeDeps(sub: ReactiveNode) {
  const depsTail = sub.depsTail;
  let dep = depsTail ? depsTail.nextDep : sub.deps;
  while (dep) dep = unlink(dep, sub);
}
