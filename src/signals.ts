type Subject<T> = {
  value: T;
  observers: Set<Observer<unknown>>;
};
type Observer<T> = {
  subjects: Set<Subject<unknown>>;
  scope: Set<Observer<unknown>>;
  fn: () => T;
  untrack?: true;
};

type Signal<T> = Subject<T>;
type Memo<T> = Subject<T> & Observer<T>;
type Effect = Observer<void>;

const stale = Symbol();

let current: Observer<unknown> | null = null;

function run<T>(o: Observer<T>) {
  const p = current;
  current = o;
  const v = o.fn();
  if ('observers' in o) (o as Memo<T>).value = v;
  current = p;
}

export function untrack<T>(fn: () => T) {
  if (current) current.untrack = true;
  const v = fn();
  if (current) delete current.untrack;
  return v;
}

export function signal<T>(value: T) {
  const s: Signal<T> = {
    value,
    observers: new Set<Observer<unknown>>(),
  };
  return [() => subjectGet(s), (newValue: T) => signalSet(s, newValue)] as [
    () => T,
    (newValue: T) => void,
  ];
}

export function memo<T>(fn: () => T) {
  const m: Memo<T> = {
    fn,
    value: stale as T,
    subjects: new Set<Subject<unknown>>(),
    observers: new Set<Observer<unknown>>(),
    scope: new Set<Observer<unknown>>(),
  };
  current?.scope.add(m);
  return () => subjectGet(m);
}

export function effect(fn: () => void) {
  const e: Effect = {
    fn,
    subjects: new Set<Subject<unknown>>(),
    scope: new Set<Observer<unknown>>(),
  };
  current?.scope.add(e);
  run(e);
}

function subjectGet<T>(s: Subject<T>) {
  if (current && !current.untrack) link(s, current);
  if (s.value === stale) run(s as Memo<T>);
  return s.value;
}

function signalSet<T>(s: Signal<T>, newValue: T) {
  if (newValue === s.value) return;
  s.value = newValue;
  const effectQueue = new Set<Effect>();
  queueObservers(s, effectQueue);
  for (const e of effectQueue) run(e);
}

function queueObservers<T>(s: Subject<T>, effectQueue: Set<Effect>) {
  for (const o of s.observers) {
    unlink(o);
    if ('observers' in o) {
      (o as Memo<T>).value = stale as T;
      queueObservers(o as Memo<T>, effectQueue);
    } else {
      effectQueue.add(o);
    }
  }
}

function link(s: Subject<unknown>, o: Observer<unknown>) {
  s.observers.add(o);
  o.subjects.add(s);
}

function unlink(o: Observer<unknown>) {
  for (const s of o.subjects) {
    s.observers.delete(o);
  }
  o.subjects.clear();
  for (const s of o.scope) {
    unlink(s);
  }
  o.scope.clear();
}
