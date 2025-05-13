import { expect, test } from 'vitest';
import { signal, memo, effect, untrack } from './signals';

test('diamond problem', () => {
  /*       d
   *     ↗   ↖
   *   b       c
   *     ↖   ↗
   *       a
   */

  const [a, setA] = signal(Symbol());

  let bRuns = 0;
  const b = memo(() => {
    bRuns++;
    return a();
  });

  let cRuns = 0;
  const c = memo(() => {
    cRuns++;
    return a();
  });

  expect(bRuns).toBe(0);
  expect(cRuns).toBe(0);

  let dRuns = 0;
  effect(() => {
    dRuns++;
    b();
    c();
  });

  expect(bRuns).toBe(1);
  expect(cRuns).toBe(1);
  expect(dRuns).toBe(1);

  setA(Symbol());

  expect(bRuns).toBe(2);
  expect(cRuns).toBe(2);
  expect(dRuns).toBe(2);
});

test('flag problem', () => {
  /*   c
   *     ↖
   *   ↑   b
   *     ↗
   *   a
   */

  const [a, setA] = signal(Symbol());

  let bRuns = 0;
  const b = memo(() => {
    bRuns++;
    return a();
  });

  expect(bRuns).toBe(0);

  let cRuns = 0;
  effect(() => {
    cRuns++;
    a();
    b();
  });

  expect(bRuns).toBe(1);
  expect(cRuns).toBe(1);

  setA(Symbol());

  expect(bRuns).toBe(2);
  expect(cRuns).toBe(2);
});

test('memo does not run until accessed, but returns correct value immediately when called directly', () => {
  const [n, setN] = signal(0);
  let doubleRuns = 0;
  const double = memo(() => {
    doubleRuns++;
    return n() * 2;
  });
  setN(1);
  expect(doubleRuns).toBe(0);
  expect(double()).toBe(2);
  expect(doubleRuns).toBe(1);
  expect(doubleRuns).toBe(1);
});

test('effect are disposed', () => {
  const signals = {
    a: signal(Symbol()),
    b: signal(Symbol()),
    c: signal(Symbol()),
  };

  const runs = {
    a: 0,
    b: 0,
    c: 0,
  };
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

test('memos are disposed', () => {
  const signals = {
    a: signal(Symbol()),
    b: signal(Symbol()),
    c: signal(Symbol()),
  };

  const runs = {
    a: 0,
    b: 0,
    c: 0,
  };

  const a = memo(() => {
    signals.a[0]();
    runs.a++;
    const b = memo(() => {
      signals.b[0]();
      runs.b++;
      const c = memo(() => {
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
  // hmm, b doesn't know that a caused the effect to run
  // it takes one extra run with b to unsub the effect
  // perhaps effects should know the associated subjects

  expect(runs).toEqual(3);
});

test('unsubscribes/resubscribes memo from unused signals', () => {
  const [a, setA] = signal(true);
  const [b, setB] = signal(Symbol());
  let runs = 0;
  const m = memo(() => {
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
  setB(Symbol());
  setB(Symbol());
  // hmm, b doesn't know that a caused the effect to run
  // it takes one extra run with b to unsub the effect
  // perhaps effects should know the associated subjects

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

test('memo not called by one effect still works for another', () => {
  const [s, setS] = signal(Symbol());
  const [tf, setTf] = signal(true);
  const m = memo(() => {
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
