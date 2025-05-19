type Subject = {
  v: any;
  o: Set<Observer>;
};
type Observer = {
  f: () => any;
  s: Set<Subject>;
  c: Set<Observer>; // child scope
  u?: true; // untrack
};

type Signal = Subject;
type Computed = Subject & Observer;
type Effect = Observer;

const stale = Symbol(); // stale

let x: Observer; // current observer

function run(o: Observer) {
  const p = x;
  x = o;
  const v = o.f();
  if ('o' in o) (o as Computed).v = v;
  x = p;
}

export function untrack<T>(f: () => T) {
  if (x) x.u = true;
  const v = f();
  if (x) delete x.u;
  return v;
}

export function signal<T>(value: T) {
  const s: Signal = {
    v: value,
    o: new Set<Observer>(),
  };
  return [() => subjectGet(s), (newValue: T) => signalSet(s, newValue)] as [
    () => T,
    (newValue: T) => void,
  ];
}

export function computed(f: () => any) {
  const m: Computed = {
    f,
    v: stale,
    s: new Set<Subject>(),
    o: new Set<Observer>(),
    c: new Set<Observer>(),
  };
  x?.c.add(m);
  return () => subjectGet(m);
}

export function effect(f: () => void) {
  const e: Effect = {
    f,
    s: new Set<Subject>(),
    c: new Set<Observer>(),
  };
  x?.c.add(e);
  run(e);
}

function subjectGet(s: Subject) {
  if (x && !x.u) link(s, x);
  if (s.v === stale) run(s as Computed);
  return s.v;
}

function signalSet(s: Signal, newValue: any) {
  if (newValue === s.v) return;
  s.v = newValue;
  const q = new Set<Effect>();
  queueObservers(s, q);
  for (const e of q) run(e);
}

function queueObservers(s: Subject, q: Set<Effect>) {
  for (const o of s.o) {
    unlink(o);
    if ('o' in o) {
      (o as Computed).v = stale;
      queueObservers(o as Computed, q);
    } else {
      q.add(o);
    }
  }
}

function link(s: Subject, o: Observer) {
  s.o.add(o);
  o.s.add(s);
}

function unlink(o: Observer) {
  for (const s of o.s) s.o.delete(o);
  o.s.clear();
  for (const s of o.c) unlink(s);
  o.c.clear();
}
