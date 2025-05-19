import { expect, test } from 'vitest';
import { signal, computed, effect, untrack } from './signals';

test('diamond', () => {
  /*
   *         d
   *       ↗   ↖
   *     b       c
   *       ↖   ↗
   *         a
   */
  const [a, setA] = signal(Symbol());
  const runs = { b: 0, c: 0, d: 0 };
  const b = computed(() => {
    runs.b++;
    return a();
  });
  const c = computed(() => {
    runs.c++;
    return a();
  });
  expect(runs).toEqual({ b: 0, c: 0, d: 0 });
  effect(() => {
    runs.d++;
    b();
    c();
  });
  expect(runs).toEqual({ b: 1, c: 1, d: 1 });
  setA(Symbol());
  expect(runs).toEqual({ b: 2, c: 2, d: 2 });
});

test('flag', () => {
  /*
   *       c
   *       ↑ ↖
   *       ↑   b
   *       ↑ ↗
   *       a
   */
  const [a, setA] = signal(Symbol());
  const runs = { b: 0, c: 0 };
  const b = computed(() => {
    runs.b++;
    return a();
  });
  expect(runs).toEqual({ b: 0, c: 0 });
  effect(() => {
    runs.c++;
    a();
    b();
  });
  expect(runs).toEqual({ b: 1, c: 1 });
  setA(Symbol());
  expect(runs).toEqual({ b: 2, c: 2 });
});

test('Y', () => {
  /*
   *    c      d
   *     ↖   ↗
   *       b
   *       ↑
   *       a
   */
  const [a, setA] = signal(Symbol());
  const runs = { b: 0, c: 0, d: 0 };
  const b = computed(() => {
    runs.b++;
    return a();
  });
  const c = computed(() => {
    runs.c++;
    return a();
  });
  expect(runs).toEqual({ b: 0, c: 0, d: 0 });
  effect(() => {
    runs.d++;
    b();
    c();
  });
  expect(runs).toEqual({ b: 1, c: 1, d: 1 });
  setA(Symbol());
  expect(runs).toEqual({ b: 2, c: 2, d: 2 });
});

test('computed does not run until accessed, returns correct value immediately when called', () => {
  const [n, setN] = signal(0);
  const runs = { double: 0 };
  const double = computed(() => {
    runs.double++;
    return n() * 2;
  });
  setN(1);
  expect(runs).toEqual({ double: 0 });
  expect(double()).toBe(2);
  expect(runs).toEqual({ double: 1 });
});

test('effect are disposed', () => {
  const signals = {
    a: signal(Symbol()),
    b: signal(Symbol()),
    c: signal(Symbol()),
  };
  const runs = { a: 0, b: 0, c: 0 };
  effect(() => {
    signals.a[0]();
    runs.a++;
    effect(() => {
      signals.b[0]();
      runs.b++;
      effect(() => {
        signals.c[0]();
        runs.c++;
      });
    });
  });
  expect(runs).toEqual({ a: 1, b: 1, c: 1 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 1, c: 2 });
  signals.b[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 2, c: 3 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 2, c: 4 });
  signals.a[1](Symbol());
  expect(runs).toEqual({ a: 2, b: 3, c: 5 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 2, b: 3, c: 6 });
});

test('computeds are disposed', () => {
  const signals = {
    a: signal(Symbol()),
    b: signal(Symbol()),
    c: signal(Symbol()),
  };
  const runs = { a: 0, b: 0, c: 0 };
  const a = computed(() => {
    signals.a[0]();
    runs.a++;
    const b = computed(() => {
      signals.b[0]();
      runs.b++;
      const c = computed(() => {
        signals.c[0]();
        runs.c++;
      });
      effect(() => c());
    });
    effect(() => b());
  });
  effect(() => a());
  expect(runs).toEqual({ a: 1, b: 1, c: 1 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 1, c: 2 });
  signals.b[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 2, c: 3 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 1, b: 2, c: 4 });
  signals.a[1](Symbol());
  expect(runs).toEqual({ a: 2, b: 3, c: 5 });
  signals.c[1](Symbol());
  expect(runs).toEqual({ a: 2, b: 3, c: 6 });
});

test('unsubscribes/resubscribes effect from unused signals', () => {
  const [a, setA] = signal(true);
  const [b, setB] = signal(Symbol());
  let runs = 0;
  effect(() => {
    runs++;
    if (a()) {
      b();
    }
  });
  expect(runs).toEqual(1);
  setB(Symbol());
  expect(runs).toEqual(2);
  setA(false);
  expect(runs).toEqual(3);
  setB(Symbol());
  setB(Symbol());
  setB(Symbol());

  expect(runs).toEqual(3);
});

test('unsubscribes/resubscribes computed from unused signals', () => {
  const [a, setA] = signal(true);
  const [b, setB] = signal(Symbol());
  let runs = 0;
  const m = computed(() => {
    runs++;
    if (a()) {
      b();
    }
  });
  effect(() => {
    m();
  });
  expect(runs).toEqual(1);
  setB(Symbol());
  expect(runs).toEqual(2);
  setA(false);
  expect(runs).toEqual(3);
  setB(Symbol());
  expect(runs).toEqual(3);
});

test('current is reset once an observer finishes', () => {
  const [s, setS] = signal(Symbol());
  let runs = 0;
  effect(() => {
    runs++;
    effect(() => {
      s();
    });
    s();
  });
  expect(runs).toBe(1);
  setS(Symbol());
  expect(runs).toBe(2);
});

test('computed not called by one effect still works for another', () => {
  const [s, setS] = signal(Symbol());
  const [tf, setTf] = signal(true);
  const m = computed(() => {
    return s();
  });
  const e = {
    a: 0,
    b: 0,
  };
  effect(() => {
    e.a++;
    if (tf()) {
      m();
    }
  });
  effect(() => {
    e.b++;
    m();
  });
  expect(e).toEqual({ a: 1, b: 1 });
  setS(Symbol());
  expect(e).toEqual({ a: 2, b: 2 });
  setTf(false);
  expect(e).toEqual({ a: 3, b: 2 });
  setS(Symbol());
  expect(e).toEqual({ a: 3, b: 3 });
});

test('untrack', () => {
  const [a, setA] = signal(Symbol());
  const [b, setB] = signal(Symbol());
  const [c, setC] = signal(Symbol());
  let runs = {
    a: 0,
    b: 0,
    c: 0,
  };
  effect(() => {
    runs.a++;
    a();
    untrack(() => {
      runs.b++;
      b();
      effect(() => {
        runs.c++;
        c();
      });
    });
  });
  expect(runs).toEqual({ a: 1, b: 1, c: 1 });
  setB(Symbol());
  expect(runs).toEqual({ a: 1, b: 1, c: 1 });
  setC(Symbol());
  expect(runs).toEqual({ a: 1, b: 1, c: 2 });
  setA(Symbol());
  expect(runs).toEqual({ a: 2, b: 2, c: 3 });
  setB(Symbol());
  expect(runs).toEqual({ a: 2, b: 2, c: 3 });
  setC(Symbol());
  expect(runs).toEqual({ a: 2, b: 2, c: 4 });
});
