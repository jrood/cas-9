type _SubjectBase<T> = {
  value: T;
  observers: Set<_Observer>;
};

type _ObserverBase<F> = {
  fn: () => F;
  initObserver: _Observer | null;
  initIteration: symbol | null;
  iteration: symbol | null;
};

export type Signal<T> = (newValue?: T) => T;
type _Signal<T> = _SubjectBase<T>;

export type Computed<T> = () => T;
type _Computed<T> = _SubjectBase<T> & _ObserverBase<T> & { stale: boolean };

export type Cleanup = () => void;
type _Effect = _ObserverBase<void | Cleanup> & { cleanup?: Cleanup };

type _Subject = _Signal<unknown> | _Computed<unknown>;
type _Observer = _Computed<unknown> | _Effect;

let currentObserver: _Observer | null = null;

function runSignal<T>(s: _Signal<T>, args: [T]) {
  if (args.length) {
    if (s.value !== args[0]) {
      s.value = args[0];
      const q = new Set<_Effect>();
      prepare(s, q);
      s.observers.clear();
      for (const e of q) runEffect(e);
    }
  } else {
    currentObserver && s.observers.add(currentObserver);
  }
  return s.value;
}

export function signal<T>(initValue: T): Signal<T> {
  const s: _Signal<T> = {
    value: initValue,
    observers: new Set<_Observer>(),
  };
  return (...args) => runSignal(s, args as [T]);
}

export function computed<T>(fn: () => T): Computed<T> {
  const c: _Computed<T> = {
    value: null as T,
    fn,
    stale: true,
    observers: new Set<_Observer>(),
    initObserver: currentObserver,
    initIteration: currentObserver?.iteration ?? null,
    iteration: null,
  };
  return () => runComputed(c);
}
function runComputed<T>(c: _Computed<T>): T {
  currentObserver && c.observers.add(currentObserver);
  if (c.stale) {
    c.value = runObserver(c) as T;
    c.stale = false;
  }
  return c.value as T;
}

function runObserver(o: _Observer) {
  if (o.initIteration !== (o.initObserver?.iteration ?? null)) return;
  const p = currentObserver;
  currentObserver = o;
  o.iteration = Symbol();
  const value = o.fn();
  currentObserver = p;
  return value;
}

export function effect(fn: () => void | Cleanup) {
  const e = {
    fn,
    initObserver: currentObserver,
    initIteration: currentObserver?.iteration ?? null,
    iteration: null,
  };
  runEffect(e);
}
function runEffect(e: _Effect) {
  e.cleanup = runObserver(e) as undefined | Cleanup;
}

const isComputed = (o: _Observer): o is _Computed<unknown> =>
  !!(o as _Computed<unknown>).observers;

function prepare(s: _Subject, q: Set<_Effect>) {
  for (const o of s.observers) {
    if (isComputed(o)) {
      o.stale = true;
      prepare(o, q);
      o.observers.clear();
    } else {
      q.add(o);
    }
  }
}
