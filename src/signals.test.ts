import { expect, test } from 'vitest';
import { signal, computed, effect } from './signals';

test('diamond problem', async () => {
  /*       d
   *     ↗   ↖
   *   b       c
   *     ↖   ↗
   *       a
   */

  const [a, setA] = signal(Symbol());

  let bRuns = 0;
  const b = computed(() => {
    bRuns++;
    return a();
  });

  let cRuns = 0;
  const c = computed(() => {
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

test('flag problem', async () => {
  /*   c
   *     ↖
   *   ↑   b
   *     ↗
   *   a
   */

  const [a, setA] = signal(Symbol());

  let bRuns = 0;
  const b = computed(() => {
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

test('computed does not run until accessed, but returns correct value immediately when called directly', async () => {
  const [n, setN] = signal(0);
  let doubleRuns = 0;
  const double = computed(() => {
    doubleRuns++;
    return n() * 2;
  });
  setN(1);
  expect(doubleRuns).toBe(0);
  expect(double()).toBe(2);
  expect(doubleRuns).toBe(1);
  expect(doubleRuns).toBe(1);
});

test('inner effects are disposed when outer effects re-run', async () => {
  const [a, setA] = signal(Symbol());
  const [b, setB] = signal(Symbol());

  let outerRuns = 0;
  let innerRuns = 0;
  effect(() => {
    outerRuns++;
    a();
    effect(() => {
      innerRuns++;
      b();
    });
  });
  setB(Symbol());
  setA(Symbol());
  setB(Symbol());
  expect(outerRuns).toBe(2);
  expect(innerRuns).toBe(4); // would be 6 if inner effects are not disposed
});

test('inner effects are disposed when outer computeds re-run', async () => {
  const [a, setA] = signal(Symbol());
  const [b, setB] = signal(Symbol());

  let outerRuns = 0;
  let innerRuns = 0;
  const outer = computed(() => {
    outerRuns++;
    a();
    effect(() => {
      innerRuns++;
      b();
    });
  });
  outer();
  setB(Symbol());
  setA(Symbol());
  outer();
  setB(Symbol());
  expect(outerRuns).toBe(2);
  expect(innerRuns).toBe(4); // would be 6 if inner effects are not disposed
});
